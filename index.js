const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits 
} = require('discord.js');
const http = require('http');
require('dotenv').config();

// Render için port sunucusu
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tendo Bot 7/24 Aktif!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Web sunucusu ${PORT} portunda başlatıldı.`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Veritabanı
const db = {
    oyuncular: new Map(), // userId -> { name, mevki, overall, sonAntrenman }
    takimlar: new Map(),  // takimAdi -> { isim, puan, av, o, g, b, m }
    sezonAktif: false
};

const commands = [
    new SlashCommandBuilder().setName('kayit').setDescription('Oyuncu profili oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu Adı Soyadı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (ST, CAM, CB, GK vb.)').setRequired(true)),
    
    new SlashCommandBuilder().setName('takim-olustur').setDescription('Yeni bir takım oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Takım Adı').setRequired(true)),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Ligdeki güncel puan durumunu gösterir.'),

    new SlashCommandBuilder().setName('antrenman').setDescription('1 saatte bir antrenman yaparak reytingini geliştirir (Max: 99).'),

    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('taktik').setDescription('Takım dizilişini ayarlar.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3').setRequired(true)),

    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Oluşturulan takımlar arasında otomatik lig sezonunu başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('mac-oyna').setDescription('Tekil canlı spikerli maç başlatır.')
        .addStringOption(opt => opt.setName('ev-sahibi').setDescription('Ev Sahibi Takım').setRequired(true))
        .addStringOption(opt => opt.setName('deplasman').setDescription('Deplasman Takımı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Slash komutları güncellendi.');
    } catch (error) {
        console.error('Komut yükleme hatası:', error);
    }
});

const olaylar = [
    { metin: "{dakika}' - ⚽ **GOOOOL!** {hücum} takımından **{oyuncu}** harika bir vuruşla fileleri havalandırdı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} oyuncusu **{oyuncu}** ceza sahası dışından 90'a astı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** Top az farkla direğin yanından avuta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** Tehlikeli bir köşe vuruşu organizasyonu.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** Sert şut direkte patladı!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} oyuncusu orta alanda rakibini indirdi.", tip: "normal" },
    { metin: "{dakika}' - 🟥 **KIRMIZI KART!** {defans} oyuncusu son adamı düşürdü ve oyundan atıldı!", tip: "kirmizi" }
];

function rastgeleGolcu() {
    const oyuncuListesi = Array.from(db.oyuncular.values()).map(o => o.name);
    if (oyuncuListesi.length > 0) {
        return oyuncuListesi[Math.floor(Math.random() * oyuncuListesi.length)];
    }
    const varsayilan = ["Ahmet", "Mehmet", "Samet", "Ali", "Alex", "Ronaldo"];
    return varsayilan[Math.floor(Math.random() * varsayilan.length)];
}

function canliMacOyna(channel, evSahibi, deplasman) {
    return new Promise(async (resolve) => {
        let evSkor = 0;
        let depSkor = 0;
        let mevcutDakika = 1;
        let ilkYariBitti = false;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle(`🎙️ CANLI SPİKER | ${evSahibi} vs ${deplasman}`)
            .setDescription(`Maç başladı! Keyifli seyirler.`)
            .setColor('#e74c3c')
            .setTimestamp();

        await channel.send({ embeds: [baslangicEmbed] }).catch(() => {});

        const macInterval = setInterval(async () => {
            mevcutDakika += Math.floor(Math.random() * 4) + 3;

            if (mevcutDakika >= 45 && !ilkYariBitti && mevcutDakika < 90) {
                ilkYariBitti = true;
                await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`).catch(() => {});
                return;
            }

            if (mevcutDakika >= 90) {
                clearInterval(macInterval);
                const bitisEmbed = new EmbedBuilder()
                    .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                    .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                    .setColor('#2ecc71')
                    .setTimestamp();

                await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor);
                resolve();
                return;
            }

            let secilenOlay;
            const sans = Math.random();
            
            if (sans < 0.02) { 
                secilenOlay = olaylar.find(o => o.tip === "kirmizi");
            } else if (sans < 0.17) { 
                const goller = olaylar.filter(o => o.tip === "gol");
                secilenOlay = goller[Math.floor(Math.random() * goller.length)];
            } else { 
                const normaller = olaylar.filter(o => o.tip === "normal");
                secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
            }

            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;

            if (secilenOlay.tip === "gol") {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;
            }

            const golcu = rastgeleGolcu();
            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = secilenOlay.metin
                .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{oyuncu}', golcu)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});

        }, 6000);
    });
}

function istatistikGuncelle(ev, dep, evSkor, depSkor) {
    let tEv = db.takimlar.get(ev.toLowerCase());
    let tDep = db.takimlar.get(dep.toLowerCase());

    if (!tEv || !tDep) return;

    tEv.o++; tDep.o++;
    tEv.av += (evSkor - depSkor);
    tDep.av += (depSkor - evSkor);

    if (evSkor > depSkor) {
        tEv.puan += 3; tEv.g++;
        tDep.m++;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++;
        tEv.m++;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
    }
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, user, channel } = interaction;

        if (commandName === 'kayit') {
            const isim = options.getString('isim');
            const mevki = options.getString('mevki');

            db.oyuncular.set(user.id, { name: isim, mevki, overall: 65, sonAntrenman: 0 });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚽ Oyuncu Kaydı Başarılı!')
                        .setColor('#00ff00')
                        .addFields(
                            { name: 'İsim', value: isim, inline: true },
                            { name: 'Mevki', value: mevki, inline: true },
                            { name: 'Reyting', value: '65', inline: true }
                        )
                ]
            });
        }

        if (commandName === 'antrenman') {
            const oyuncu = db.oyuncular.get(user.id);

            if (!oyuncu) {
                return interaction.reply({ content: '❌ Önce `/kayit` komutu ile profilinizi oluşturmalısınız.', ephemeral: true });
            }

            if (oyuncu.overall >= 99) {
                return interaction.reply({ content: '🌟 Tebrikler! Zaten maksimum reytinge (99) ulaştınız.', ephemeral: true });
            }

            const simdi = Date.now();
            const birSaat = 60 * 60 * 1000; // milisaniye cinsinden 1 saat

            if (simdi - oyuncu.sonAntrenman < birSaat) {
                const kalanDakika = Math.ceil((birSaat - (simdi - oyuncu.sonAntrenman)) / (1000 * 60));
                return interaction.reply({ 
                    content: `⏳ Henüz antrenman yapacak kadar dinlenmediniz! Lütfen **${kalanDakika} dakika** sonra tekrar deneyin.`, 
                    ephemeral: true 
                });
            }

            // Reytinge rastgele 1 ile 3 arası puan ekle
            const artis = Math.floor(Math.random() * 3) + 1;
            oyuncu.overall = Math.min(99, oyuncu.overall + artis);
            oyuncu.sonAntrenman = simdi;

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏋️‍♂️ Antrenman Tamamlandı!')
                        .setDescription(`Ağır antrenmanlar meyvesini verdi! **+${artis} Reyting** kazandınız.`)
                        .setColor('#f39c12')
                        .addFields(
                            { name: 'Yeni Reyting', value: `${oyuncu.overall}`, inline: true },
                            { name: 'Bir Sonraki Antrenman', value: '1 saat sonra', inline: true }
                        )
                ]
            });
        }

        if (commandName === 'takim-olustur') {
            const takimIsmi = options.getString('isim');
            const key = takimIsmi.toLowerCase();
            
            if (db.takimlar.has(key)) {
                return interaction.reply({ content: '❌ Bu isimde bir takım zaten var!', ephemeral: true });
            }

            db.takimlar.set(key, { 
                isim: takimIsmi, 
                kurucu: user.id, 
                puan: 0, 
                av: 0, 
                o: 0, 
                g: 0, 
                b: 0, 
                m: 0 
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛡️ Takım Oluşturuldu!')
                        .setDescription(`**${takimIsmi}** takımı lig sistemine başarıyla eklendi! Kurucu: <@${user.id}>`)
                        .setColor('#f1c40f')
                ]
            });
        }

        if (commandName === 'puan-durumu') {
            if (db.takimlar.size === 0) {
                return interaction.reply({ content: 'Henüz kayıtlı bir takım yok. `/takim-olustur` ile takım ekleyin!', ephemeral: true });
            }

            const sirali = Array.from(db.takimlar.values())
                .sort((a, b) => b.puan - a.puan || b.av - a.av);

            let liste = "";
            sirali.forEach((t, i) => {
                liste += `**${i + 1}. ${t.isim}** | O: ${t.o} | G: ${t.g} | B: ${t.b} | M: ${t.m} | AV: ${t.av} | **Puan: ${t.puan}**\n`;
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏆 TENDO LEAGUE - PUAN DURUMU')
                        .setDescription(liste)
                        .setColor('#3498db')
                ]
            });
        }

        if (commandName === 'sezon-baslat') {
            const takimListesi = Array.from(db.takimlar.values());

            if (takimListesi.length < 2) {
                return interaction.reply({ content: '❌ Sezonu başlatmak için en az **2 takım** oluşturulmuş olmalıdır! `/takim-olustur` komutunu kullanın.', ephemeral: true });
            }

            db.sezonAktif = true;
            await interaction.reply({ content: `🚀 **TENDO LEAGUE SEZONU BAŞLIYOR!** Toplam ${takimListesi.length} takım mücadele edecek.` });

            for (let i = 0; i < takimListesi.length; i++) {
                for (let j = i + 1; j < takimListesi.length; j++) {
                    const ev = takimListesi[i].isim;
                    const dep = takimListesi[j].isim;

                    await channel.send(`📢 **SIRADAKİ MAÇ:** **${ev} vs ${dep}** başlamak üzere!`);
                    await canliMacOyna(channel, ev, dep);
                    await new Promise(r => setTimeout(r, 5000));
                }
            }

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🎉 SEZON BİTTİ!')
                        .setDescription('Tüm maçlar tamamlandı! Puan durumunu görmek için `/puan-durumu` yazabilirsiniz.')
                        .setColor('#2ecc71')
                ]
            });
        }

        if (commandName === 'mac-oyna') {
            const evSahibi = options.getString('ev-sahibi');
            const deplasman = options.getString('deplasman');

            await interaction.reply({ content: `⏳ **${evSahibi} vs ${deplasman}** maçı bu kanalda başlatılıyor...` });
            canliMacOyna(channel, evSahibi, deplasman);
        }

        if (commandName === 'profil') {
            const target = options.getUser('hedef') || user;
            const p = db.oyuncular.get(target.id);

            if (!p) return interaction.reply({ content: 'Oyuncu profili bulunamadı.', ephemeral: true });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`👤 ${p.name} - Profil`)
                        .setColor('#3498db')
                        .addFields(
                            { name: 'Mevki', value: p.mevki, inline: true },
                            { name: 'Reyting', value: `${p.overall}`, inline: true }
                        )
                ]
            });
        }

        if (commandName === 'taktik') {
            const dizilis = options.getString('dizilis');
            return interaction.reply({ content: `✅ Takım dizilişiniz **${dizilis}** olarak güncellendi.` });
        }

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
