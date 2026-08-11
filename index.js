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
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error("Veri kaydetme hatası:", e);
    }
}

// Hazır 20 Ünlü Takım Listesi
const UNLU_TAKIMLAR = [
    "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
    "Real Madrid", "Barcelona", "Manchester City", "Arsenal",
    "Liverpool", "Manchester United", "Bayern München", "Borussia Dortmund",
    "Paris Saint-Germain", "Inter", "AC Milan", "Juventus",
    "Atletico Madrid", "Chelsea", "Napoli", "Benfica"
];

function otomatikTakimlariYukle() {
    let eklendi = 0;
    if (!db.takimlar) db.takimlar = {};
    UNLU_TAKIMLAR.forEach(takimIsmi => {
        const key = takimIsmi.toLowerCase();
        if (!db.takimlar[key]) {
            db.takimlar[key] = {
                isim: takimIsmi,
                kurucu: "Sistem",
                puan: 0,
                av: 0,
                o: 0,
                g: 0,
                b: 0,
                m: 0,
                butce: 500000,
                sonSponsor: 0
            };
            eklendi++;
        }
    });
    if (eklendi > 0) {
        veriyiKaydet();
    }
    return eklendi;
}

// Sunucudaki ismi güncelleme fonksiyonu
async function isimGuncelle(guild, member, isim, mevki, piyasaDegeri) {
    try {
        if (!guild || !member) return;
        if (guild.ownerId === member.id) {
            return;
        }
        const yeniNick = `${isim} | ${mevki} | ${piyasaDegeri}M€`;
        if (member.manageable) {
            await member.setNickname(yeniNick);
        }
    } catch (err) {
        console.error("İsim değiştirilemedi:", err.message);
    }
}

const commands = [
    new SlashCommandBuilder()
        .setName('otomatik-takimlar')
        .setDescription('20 adet ünlü takımı otomatik olarak lige ekler (Yönetici).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('kayit')
        .setDescription('Kullanıcıyı kaydeder ve ismini düzenler.')
        .addUserOption(opt => opt.setName('kisi').setDescription('Kaydedilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu adı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (Örn: SNT, KANAT, OS, STP, KL)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('dver')
        .setDescription('Oyuncunun piyasa değerini arttırır.')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değer verilecek oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Eklenecek değer (M€)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('dal')
        .setDescription('Oyuncunun piyasa değerini düşürür.')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değeri alınacak oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Düşürülecek değer (M€)').setRequired(true)),

    new SlashCommandBuilder().setName('antrenman').setDescription('Antrenman yaparak piyasa değerini rastgele (1M€ - 7M€) arttırır (1 saatte bir).'),

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
    
    otomatikTakimlariYukle();

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

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, user, channel, member, guild } = interaction;

        if (!db.oyuncular) db.oyuncular = {};
        if (!db.takimlar) db.takimlar = {};

        if (commandName === 'kayit') {
            if (KAYIT_YETKILI_ROL_ID !== 'BURAYA_KAYIT_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Kayıt Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const hedefMember = await guild.members.fetch(hedefKullanici.id).catch(() => null);
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

            if (hedefMember) {
                await isimGuncelle(guild, hedefMember, yeniIsim, mevki, 1);
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Oyuncu Kaydı Başarılı!')
                        .setDescription(`**<@${hedefKullanici.id}>** sisteme başarıyla kaydedildi!`)
                        .setColor('#2ecc71')
                        .addFields(
                            { name: 'Oyuncu Adı', value: yeniIsim, inline: true },
                            { name: 'Mevki', value: mevki, inline: true },
                            { name: 'Piyasa Değeri', value: '1M€', inline: true }
                        )
                ]
            });
        }

        if (commandName === 'dver') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Değer Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const eklenecekDeger = options.getInteger('miktar');
            
            // Eğer veritabanında kaydı yoksa otomatik oluştur
            if (!db.oyuncular[hedefKullanici.id]) {
                db.oyuncular[hedefKullanici.id] = {
                    id: hedefKullanici.id,
                    name: hedefKullanici.username,
                    mevki: 'SNT',
                    piyasaDegeri: 1,
                    gol: 0,
                    sakatlik: false,
                    cezali: false,
                    takim: 'Serbest Oyuncu',
                    sonAntrenman: 0
                };
            }

            const oyuncu = db.oyuncular[hedefKullanici.id];
            oyuncu.piyasaDegeri = (oyuncu.piyasaDegeri || 1) + eklenecekDeger;
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(hedefKullanici.id).catch(() => null);
            if (hedefMember) await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Değer Güncellendi')
                        .setDescription(`**Oyuncu:** <@${hedefKullanici.id}> | ${oyuncu.mevki} | **${oyuncu.piyasaDegeri}M€**`)
                        .setColor('#3498db')
                        .addFields(
                            { name: '➕ Eklenen Değer', value: `${eklenecekDeger}M€`, inline: true },
                            { name: '💰 Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true }
                        )
                ]
            });
        }

        if (commandName === 'dal') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ 
                    content: "❌ Bu komutu kullanmak için **Değer Yetkilisi** rolüne sahip olmalısınız!", 
                    ephemeral: true 
                });
            }

            const hedefKullanici = options.getUser('kisi');
            const dusurulecekDeger = options.getInteger('miktar');

            // Eğer veritabanında kaydı yoksa otomatik oluştur
            if (!db.oyuncular[hedefKullanici.id]) {
                db.oyuncular[hedefKullanici.id] = {
                    id: hedefKullanici.id,
                    name: hedefKullanici.username,
                    mevki: 'SNT',
                    piyasaDegeri: 1,
                    gol: 0,
                    sakatlik: false,
                    cezali: false,
                    takim: 'Serbest Oyuncu',
                    sonAntrenman: 0
                };
            }

            const oyuncu = db.oyuncular[hedefKullanici.id];
            oyuncu.piyasaDegeri = Math.max(1, (oyuncu.piyasaDegeri || 1) - dusurulecekDeger);
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(hedefKullanici.id).catch(() => null);
            if (hedefMember) await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🔻 Değer Düşürüldü')
                        .setDescription(`**Oyuncu:** <@${hedefKullanici.id}> | ${oyuncu.mevki} | **${oyuncu.piyasaDegeri}M€**`)
                        .setColor('#e74c3c')
                        .addFields(
                            { name: '➖ Düşürülen Değer', value: `${dusurulecekDeger}M€`, inline: true },
                            { name: '💰 Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true }
                        )
                ]
            });
        }

        if (commandName === 'antrenman') {
            // Kullanıcı veritabanında yoksa otomatik oluştur
            if (!db.oyuncular[user.id]) {
                db.oyuncular[user.id] = {
                    id: user.id,
                    name: user.username,
                    mevki: 'SNT',
                    piyasaDegeri: 1,
                    gol: 0,
                    sakatlik: false,
                    cezali: false,
                    takim: 'Serbest Oyuncu',
                    sonAntrenman: 0
                };
            }

            const oyuncu = db.oyuncular[user.id];
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

            const kazanilanDeger = Math.floor(Math.random() * 7) + 1;

            oyuncu.piyasaDegeri = (oyuncu.piyasaDegeri || 1) + kazanilanDeger;
            oyuncu.sonAntrenman = simdi;
            oyuncu.sakatlik = false;
            oyuncu.cezali = false;
            veriyiKaydet();

            const hedefMember = await guild.members.fetch(user.id).catch(() => null);
            if (hedefMember) await isimGuncelle(guild, hedefMember, oyuncu.name, oyuncu.mevki, oyuncu.piyasaDegeri);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏋️‍♂️ Antrenman Tamamlandı!')
                        .setDescription(`**${oyuncu.name}** verimli bir antrenman geçirdi! **+${kazanilanDeger}M€ Piyasa Değeri** kazandı.`)
                        .setColor('#f39c12')
                        .addFields(
                            { name: 'Kazanılan Değer', value: `+${kazanilanDeger}M€`, inline: true },
                            { name: 'Yeni Piyasa Değeri', value: `${oyuncu.piyasaDegeri}M€`, inline: true },
                            { name: 'Bir Sonraki Antrenman', value: '1 saat sonra', inline: true }
                        )
                ]
            });
        }

        if (commandName === 'kart' || commandName === 'profil') {
            const target = options.getUser('hedef') || user;
            if (!db.oyuncular[target.id]) {
                db.oyuncular[target.id] = {
                    id: target.id,
                    name: target.username,
                    mevki: 'SNT',
                    piyasaDegeri: 1,
                    gol: 0,
                    sakatlik: false,
                    cezali: false,
                    takim: 'Serbest Oyuncu',
                    sonAntrenman: 0
                };
            }
            const p = db.oyuncular[target.id];
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

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
