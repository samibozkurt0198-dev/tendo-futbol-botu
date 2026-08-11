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

const db = {
    oyuncular: new Map(),
    takimlar: new Map(),
    sezonAktif: false
};

const commands = [
    new SlashCommandBuilder().setName('kayit').setDescription('Oyuncu profili oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu Adı Soyadı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (ST, CAM, CB, GK vb.)').setRequired(true)),
    
    new SlashCommandBuilder().setName('takim-olustur').setDescription('Yeni bir takım oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Takım Adı').setRequired(true)),

    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('taktik').setDescription('Takım dizilişini ayarlar.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3').setRequired(true)),

    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Sezonu başlatır ve kanallara duyuru atar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('mac-oyna').setDescription('Canlı spikerli maç başlatır.')
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

function findChannelByName(guild, name) {
    return guild.channels.cache.find(c => c.name.toLowerCase().includes(name.toLowerCase()) && c.isTextBased());
}

// Olaylar
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

async function canliMacOyna(channel, evSahibi, deplasman) {
    let evSkor = 0;
    let depSkor = 0;
    let mevcutDakika = 1;
    let ilkYariBitti = false;

    // Kayıtlı oyuncu isimlerini al
    const oyuncuListesi = Array.from(db.oyuncular.values()).map(o => o.name);
    
    function rastgeleGolcu() {
        if (oyuncuListesi.length > 0) {
            return oyuncuListesi[Math.floor(Math.random() * oyuncuListesi.length)];
        }
        const varsayilanGolcular = ["Ahmet", "Mehmet", "Samet", "Ali", "Alex", "Ronaldo"];
        return varsayilanGolcular[Math.floor(Math.random() * varsayilanGolcular.length)];
    }

    const baslangicEmbed = new EmbedBuilder()
        .setTitle(`🎙️ CANLI SPİKER | ${evSahibi} vs ${deplasman}`)
        .setDescription(`Maç başladı! Keyifli seyirler.`)
        .setColor('#e74c3c')
        .setTimestamp();

    await channel.send({ embeds: [baslangicEmbed] });

    const macInterval = setInterval(async () => {
        mevcutDakika += Math.floor(Math.random() * 4) + 3;

        // İlk Yarı
        if (mevcutDakika >= 45 && !ilkYariBitti && mevcutDakika < 90) {
            ilkYariBitti = true;
            await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`).catch(() => {});
            return;
        }

        // Maç Bitiş
        if (mevcutDakika >= 90) {
            clearInterval(macInterval);
            const bitisEmbed = new EmbedBuilder()
                .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                .setColor('#2ecc71')
                .setTimestamp();

            await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
            return;
        }

        let secilenOlay;
        const sans = Math.random();
        
        // DENGELENMİŞ İHTİMALLER: Gol %15, Kırmızı %2, Pozisyon %83
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

    }, 8000);
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, guild, user, channel } = interaction;

        if (commandName === 'kayit') {
            const isim = options.getString('isim');
            const mevki = options.getString('mevki');

            db.oyuncular.set(user.id, { name: isim, mevki, overall: 65 });

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

        if (commandName === 'takim-olustur') {
            const takimIsmi = options.getString('isim');
            
            if (db.takimlar.has(takimIsmi.toLowerCase())) {
                return interaction.reply({ content: '❌ Bu isimde bir takım zaten var!', ephemeral: true });
            }

            db.takimlar.set(takimIsmi.toLowerCase(), { isim: takimIsmi, kurucu: user.id, oyuncular: [] });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛡️ Takım Oluşturuldu!')
                        .setDescription(`**${takimIsmi}** takımı başarıyla kuruldu! Kurucu: <@${user.id}>`)
                        .setColor('#f1c40f')
                ]
            });
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

        if (commandName === 'sezon-baslat') {
            db.sezonAktif = true;

            const duyuruKanal = findChannelByName(guild, 'duyuru');
            if (duyuruKanal) {
                await duyuruKanal.send({ embeds: [new EmbedBuilder().setTitle('📢 YENİ SEZON BAŞLADI!').setDescription('Tendo League yeni sezonu açılmıştır!').setColor('#ff0000')] }).catch(() => {});
            }

            return interaction.reply({ content: '✅ Sezon başarıyla başlatıldı!' });
        }

        if (commandName === 'mac-oyna') {
            const evSahibi = options.getString('ev-sahibi');
            const deplasman = options.getString('deplasman');

            await interaction.reply({ content: `⏳ **${evSahibi} vs ${deplasman}** maçı bu kanalda başlatılıyor...` });
            canliMacOyna(channel, evSahibi, deplasman);
        }
    } catch (err) {
        console.error('Komut hatası:', err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: 'Bir hata oluştu, lütfen tekrar deneyin.', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
