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
const fs = require('fs');
require('dotenv').config();

// --- ROL VE YETKİ AYARLARI ---
const KAYIT_YETKILI_ROL_ID = 'BURAYA_KAYIT_YETKILISI_ROL_ID_YAZ';
const DEGER_YETKILI_ROL_ID = 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ';
// ------------------------------

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
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const DB_FILE = './database.json';
let db = {
    oyuncular: {},
    takimlar: {},
    sezonAktif: false
};

if (fs.existsSync(DB_FILE)) {
    try {
        db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    } catch (e) {
        console.error("Veritabanı okuma hatası:", e);
    }
}

function veriyiKaydet() {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Sunucudaki ismi güncelleme fonksiyonu
async function isimGuncelle(guild, member, isim, mevki, piyasaDegeri) {
    try {
        if (guild.ownerId === member.id) {
            console.log("Sunucu sahibinin ismi bot tarafından değiştirilemez.");
            return;
        }
        const yeniNick = `${isim} | ${mevki} | ${piyasaDegeri}M€`;
        if (member.manageable) {
            await member.setNickname(yeniNick);
        }
    } catch (err) {
        console.error("İsim değiştirilemedi (Yetki hiyerarşisi veya yetersiz izin):", err.message);
    }
}

const commands = [
    // /kayit
    new SlashCommandBuilder()
        .setName('kayit')
        .setDescription('Kullanıcıyı kaydeder ve ismini düzenler (Kayıt Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Kaydedilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu adı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (Örn: SNT, KANAT, OS, STP, KL)').setRequired(true)),

    // /dver
    new SlashCommandBuilder()
        .setName('dver')
        .setDescription('Oyuncunun piyasa değerini arttırır (Değer Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değer verilecek oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Eklenecek değer (M€)').setRequired(true)),

    // /dal
    new SlashCommandBuilder()
        .setName('dal')
        .setDescription('Oyuncunun piyasa değerini düşürür (Değer Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değeri alınacak oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Düşürülecek değer (M€)').setRequired(true)),

    new SlashCommandBuilder().setName('antrenman').setDescription('Antrenman yaparak piyasa değerini +5M€ arttırır (1 saatte bir).'),

    new SlashCommandBuilder().setName('kart').setDescription('Oyuncu kartını görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Kartı görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('takim-olustur').setDescription('Yeni bir takım oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Takım Adı').setRequired(true)),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Ligdeki güncel puan durumunu gösterir.'),

    new SlashCommandBuilder().setName('gol-kralligi').setDescription('En çok gol atan oyuncuları listeler.'),

    new SlashCommandBuilder().setName('transfer').setDescription('Takımınıza bir oyuncuyu transfer edin.')
        .addUserOption(opt => opt.setName('oyuncu').setDescription('Transfer edilecek oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Ödenecek bonservis bedeli (€)').setRequired(true)),

    new SlashCommandBuilder().setName('sponsor').setDescription('Takımınız için sponsorluk geliri alırsınız (3 saatte bir).'),

    new SlashCommandBuilder().setName('butce').setDescription('Takımınızın bütçesini görüntüler.'),

    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Otomatik lig sezonunu başlatır.')
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
    { metin: "{dakika}' - 🚑 **SAKATLIK!** {hücum} oyuncusu **{oyuncu}** acı içinde yerde kaldı, maça devam edemiyor!", tip: "sakatlik" },
    { metin: "{dakika}' - 🟥 **KIRMIZI KART!** {defans} oyuncusu **{oyuncu}** son adamı düşürdü ve oyundan atıldı!", tip: "kirmizi" }
];

function rastgeleOyuncuSec() {
    const tumu = Object.values(db.oyuncular).filter(o => !o.sakatlik && !o.cezali);
    if (tumu.length > 0) {
        return tumu[Math.floor(Math.random() * tumu.length)];
    }
    return { name: "Bilinmeyen Oyuncu", id: null };
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
            } else if (sans < 0.04) {
                secilenOlay = olaylar.find(o => o.tip === "sakatlik");
            } else if (sans < 0.17) { 
                const goller = olaylar.filter(o => o.tip === "gol");
                secilenOlay = goller[Math.floor(Math.random() * goller.length)];
            } else { 
                const normaller = olaylar.filter(o => o.tip === "normal");
                secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
            }

            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;

            const secilenOyuncu = rastgeleOyuncuSec();

            if (secilenOlay.tip === "gol") {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;

                if (secilenOyuncu && secilenOyuncu.id) {
                    db.oyuncular[secilenOyuncu.id].gol = (db.oyuncular[secilenOyuncu.id].gol || 0) + 1;
                    veriyiKaydet();
                }
            } else if (secilenOlay.tip === "sakatlik" && secilenOyuncu.id) {
                db.oyuncular[secilenOyuncu.id].sakatlik = true;
                veriyiKaydet();
            } else if (secilenOlay.tip === "kirmizi" && secilenOyuncu.id) {
                db.oyuncular[secilenOyuncu.id].cezali = true;
                veriyiKaydet();
            }

            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = secilenOlay.metin
                .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{oyuncu}', secilenOyuncu.name)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});

        }, 6000);
    });
}

function istatistikGuncelle(ev, dep, evSkor, depSkor) {
    let keyEv = ev.toLowerCase();
    let keyDep = dep.toLowerCase();
    
    let tEv = db.takimlar[keyEv];
    let tDep = db.takimlar[keyDep];

    if (!tEv || !tDep) return;

    tEv.o++; tDep.o++;
    tEv.av += (evSkor - depSkor);
    tDep.av += (depSkor - evSkor);

    if (evSkor > depSkor) {
        tEv.puan += 3; tEv.g++; tDep.m++;
        tEv.butce += 50000;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++; tEv.m++;
        tDep.butce += 50000;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
        tEv.butce += 20000; tDep.butce += 20000;
    }

    veriyiKaydet();
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, user, channel, member, guild } = interaction;

        // KAYIT KOMUTU
        if (commandName === 'kayit') {
            if (KAYIT_YETKILI_ROL_ID !== 'BURAYA_KAYIT_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Kayıt Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const hedefMember = await guild.members.fetch(hedefKullanici.id);
            const yeniIsim = options.getString('isim');
            const mevki = options.getString('mevki').toUpperCase();

            db.oyuncular[hedefKullanici.id] = { 
                id: hedefKullanici.id,
                name: yeniIsim, 
                mevki: mevki, 
                piyasaDegeri: 1,
                gol: 0,
                sakatlik: false,
                cezali: false,
                takim: 'Serbest Oyuncu',
                sonAntrenman: 0 
            };
            veriyiKaydet();

            await isimGuncelle(guild, hedefMember, yeniIsim, mevki, 1);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Oyuncu Kaydı Başarılı!')
                        .setDescription(`**<@${hedefKullanici.id}>** sisteme başarıyla kaydedildi!`)
                        .setColor('#2ecc71')
                        .addFields(
                            { name: 'Oyuncu Adı', value: yeniIsim, inline: true },
                            { name: 'Mevki', value: mevki, inline: true },
                            { name: 'Piyasa Değeri', value: '1M€', inline: true },
                            { name: 'Kaydeden Yetkili', value: `<@${user.id}>`, inline: true }
                        )
                ]
            });
        }

        // DEĞER VERME KOMUTU (/dver)
        if (commandName === 'dver') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Değer Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const eklenecekDeger = options.getInteger('miktar');
            const oyuncu = db.oyuncular[hedefKullanici.id];

            if (!oyuncu) {
                return interaction.reply({ content: '❌ Bu kullanıcı henüz sisteme kayıtlı değil!', ephemeral: true });
            }

            oyuncu.piyasaDegeri = (oyuncu.piyasaDegeri || 1) + eklenecekDeger;
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(hedefKullanici.id);
            await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Değer Güncellendi')
                        .setDescription(`**Oyuncu:** <@${hedefKullanici.id}> | ${oyuncu.mevki} | **${oyuncu.piyasaDegeri}M€**`)
                        .setColor('#3498db')
                        .addFields(
                            { name: '➕ Eklenen Değer', value: `${eklenecekDeger}M€`, inline: true },
                            { name: '💰 Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true },
                            { name: '👮 Yetkili', value: `<@${user.id}>`, inline: true }
                        )
                ]
            });
        }

        // DEĞER ALMA KOMUTU (/dal)
        if (commandName === 'dal') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Değer Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const dusurulecekDeger = options.getInteger('miktar');
            const oyuncu = db.oyuncular[hedefKullanici.id];

            if (!oyuncu) {
                return interaction.reply({ content: '❌ Bu kullanıcı henüz sisteme kayıtlı değil!', ephemeral: true });
            }

            oyuncu.piyasaDegeri = Math.max(1, (oyuncu.piyasaDegeri || 1) - dusurulecekDeger);
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(hedefKullanici.id);
            await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🔻 Değer Düşürüldü')
                        .setDescription(`**Oyuncu:** <@${hedefKullanici.id}> | ${oyuncu.mevki} | **${oyuncu.piyasaDegeri}M€**`)
                        .setColor('#e74c3c')
                        .addFields(
                            { name: '➖ Düşürülen Değer', value: `${dusurulecekDeger}M€`, inline: true },
                            { name: '💰 Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true },
                            { name: '👮 Yetkili', value: `<@${user.id}>`, inline: true }
                        )
                ]
            });
        }

        // ANTRENMAN KOMUTU (+5M€)
        if (commandName === 'antrenman') {
            const oyuncu = db.oyuncular[user.id];

            if (!oyuncu) {
                return interaction.reply({ content: '❌ Kayıtlı bir profiliniz bulunamadı. Lütfen yetkililerden sizi kaydetmesini isteyin.', ephemeral: true });
            }

            const simdi = Date.now();
            const birSaat = 60 * 60 * 1000;

            if (simdi - (oyuncu.sonAntrenman || 0) < birSaat) {
                const kalanMs = birSaat - (simdi - oyuncu.sonAntrenman);
                const kalanDakika = Math.ceil(kalanMs / (1000 * 60));

                return interaction.reply({ 
                    content: `⏳ Henüz antrenman yapacak kadar dinlenmediniz! Lütfen **${kalanDakika} dakika** sonra tekrar deneyin.`, 
                    ephemeral: true 
                });
            }

            oyuncu.piyasaDegeri = (oyuncu.piyasaDegeri || 1) + 5;
            oyuncu.sonAntrenman = simdi;
            oyuncu.sakatlik = false;
            oyuncu.cezali = false;
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(user.id);
            await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏋️‍♂️ Antrenman Tamamlandı!')
                        .setDescription(`**${oyuncu.name}** harika bir antrenman geçirdi! **+5M€ Piyasa Değeri** kazandı.`)
                        .setColor('#f39c12')
                        .addFields(
                            { name: 'Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true },
                            { name: 'Bir Sonraki Antrenman', value: '1 saat sonra', inline: true }
                        )
                ]
            });
        }

        // KART VE PROFİL
        if (commandName === 'kart' || commandName === 'profil') {
            const target = options.getUser('hedef') || user;
            const p = db.oyuncular[target.id];

            if (!p) return interaction.reply({ content: '❌ Oyuncu profili bulunamadı.', ephemeral: true });

            const status = p.sakatlik ? '🚑 Sakat' : (p.cezali ? '🟥 Cezalı' : '✅ Aktif');

            const embed = new EmbedBuilder()
                .setTitle(`🎴 OYUNCU KARTI | ${p.name}`)
                .setColor('#f1c40f')
                .addFields(
                    { name: '💰 Piyasa Değeri', value: `**${p.piyasaDegeri || 1}M€**`, inline: true },
                    { name: '📍 Mevki', value: `${p.mevki}`, inline: true },
                    { name: '🛡️ Takım', value: `${p.takim}`, inline: true },
                    { name: '⚽ Toplam Gol', value: `${p.gol || 0}`, inline: true },
                    { name: '📌 Durum', value: status, inline: true }
                )
                .setFooter({ text: 'Tendo Football Card System' });

            return interaction.reply({ embeds: [embed] });
        }

        if (commandName === 'gol-kralligi') {
            const oyuncular = Object.values(db.oyuncular).filter(o => o.gol > 0);

            if (oyuncular.length === 0) {
                return interaction.reply({ content: 'Henüz gol atan oyuncu bulunmuyor!', ephemeral: true });
            }

            const sirali = oyuncular.sort((a, b) => b.gol - a.gol).slice(0, 10);
            let liste = "";
            sirali.forEach((o, i) => {
                liste += `**${i + 1}. ${o.name}** (${o.takim}) - **${o.gol} Gol**\n`;
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚽ GOL KRALLIĞI')
                        .setDescription(liste)
                        .setColor('#e67e22')
                ]
            });
        }

        if (commandName === 'transfer') {
            const hedefOyuncu = options.getUser('oyuncu');
            const bonservis = options.getInteger('bonservis');

            const oyuncuData = db.oyuncular[hedefOyuncu.id];
            if (!oyuncuData) return interaction.reply({ content: '❌ Transfer edilmek istenen oyuncu sistemde kayıtlı değil!', ephemeral: true });

            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Transfer yapabilmek için takım sahibi olmalısınız!', ephemeral: true });

            if (kulup.butce < bonservis) {
                return interaction.reply({ content: `❌ Bütçeniz yetersiz! Kasanızda **€${kulup.butce.toLocaleString()}** var.`, ephemeral: true });
            }

            kulup.butce -= bonservis;
            oyuncuData.takim = kulup.isim;
            veriyiKaydet();

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🤝 TRANSFER GERÇEKLEŞTİ!')
                        .setDescription(`**${oyuncuData.name}**, **€${bonservis.toLocaleString()}** karşılığında **${kulup.isim}** takımına transfer oldu!`)
                        .setColor('#2ecc71')
                ]
            });
        }

        if (commandName === 'sponsor') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Sadece takım sahipleri sponsor anlaşması yapabilir!', ephemeral: true });

            const simdi = Date.now();
            const ucSaat = 3 * 60 * 60 * 1000;

            if (simdi - (kulup.sonSponsor || 0) < ucSaat) {
                const kalanDakika = Math.ceil((ucSaat - (simdi - kulup.sonSponsor)) / (1000 * 60));
                return interaction.reply({ content: `⏳ Sponsorlar henüz yeni teklif sunmadı. Lütfen **${kalanDakika} dakika** sonra tekrar deneyin.`, ephemeral: true });
            }

            const gelir = Math.floor(Math.random() * 50000) + 50000;
            kulup.butce += gelir;
            kulup.sonSponsor = simdi;
            veriyiKaydet();

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('💼 SPONSORLUK ANLAŞMASI!')
                        .setDescription(`**${kulup.isim}**, yeni sponsorluk sözleşmesinden **€${gelir.toLocaleString()}** gelir elde etti!`)
                        .setColor('#f1c40f')
                ]
            });
        }

        if (commandName === 'butce') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Herhangi bir takımın kurucusu değilsiniz.', ephemeral: true });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`💰 ${kulup.isim} - Bütçe Durumu`)
                        .setDescription(`Mevcut Kasa Bakiyesi: **€${kulup.butce.toLocaleString()}**`)
                        .setColor('#2ecc71')
                ]
            });
        }

        if (commandName === 'takim-olustur') {
            const takimIsmi = options.getString('isim');
            const key = takimIsmi.toLowerCase();
            
            if (db.takimlar[key]) {
                return interaction.reply({ content: '❌ Bu isimde bir takım zaten var!', ephemeral: true });
            }

            db.takimlar[key] = { 
                isim: takimIsmi, 
                kurucu: user.id, 
                puan: 0, 
                av: 0, 
                o: 0, 
                g: 0, 
                b: 0, 
                m: 0,
                butce: 100000,
                sonSponsor: 0
            };
            veriyiKaydet();

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛡️ Takım Oluşturuldu!')
                        .setDescription(`**${takimIsmi}** takımı eklendi! Başlangıç Bütçesi: **€100.000**`)
                        .setColor('#f1c40f')
                ]
            });
        }

        if (commandName === 'puan-durumu') {
            const takimlar = Object.values(db.takimlar);

            if (takimlar.length === 0) {
                return interaction.reply({ content: 'Henüz kayıtlı bir takım yok. `/takim-olustur` ile takım ekleyin!', ephemeral: true });
            }

            const sirali = takimlar.sort((a, b) => b.puan - a.puan || b.av - a.av);

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
            const takimListesi = Object.values(db.takimlar);

            if (takimListesi.length < 2) {
                return interaction.reply({ content: '❌ Sezonu başlatmak için en az **2 takım** oluşturulmuş olmalıdır!', ephemeral: true });
            }

            db.sezonAktif = true;
            veriyiKaydet();
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
                        .setDescription('Tüm maçlar tamamlandı! Puan durumunu görmek için `/puan-durumu`, gol krallığı için `/gol-kralligi` yazabilirsiniz.')
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

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
