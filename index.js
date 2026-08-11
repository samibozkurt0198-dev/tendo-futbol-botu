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
                kurucu: null,
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

async function isimGuncelle(guild, member, isim, mevki, piyasaDegeri) {
    try {
        if (!guild || !member) return;
        if (guild.ownerId === member.id) return;
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
        .setDescription('Kullanıcıyı kaydeder ve ismini düzenler (Kayıt Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Kaydedilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('isim').setDescription('Oyuncu adı').setRequired(true))
        .addStringOption(opt => opt.setName('mevki').setDescription('Mevki (Örn: SNT, KANAT, OS, STP, KL)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('dver')
        .setDescription('Oyuncunun piyasa değerini arttırır (Değer Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değer verilecek oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Eklenecek değer (M€)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('dal')
        .setDescription('Oyuncunun piyasa değerini düşürür (Değer Yetkilisi).')
        .addUserOption(opt => opt.setName('kisi').setDescription('Değeri alınacak oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Düşürülecek değer (M€)').setRequired(true)),

    new SlashCommandBuilder().setName('antrenman').setDescription('Antrenman yaparak piyasa değerini rastgele (1M€ - 7M€) arttırır (1 saatte bir).'),

    new SlashCommandBuilder().setName('kart').setDescription('Oyuncu kartını görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Kartı görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('takim-olustur').setDescription('Yeni bir özel takım oluşturur.')
        .addStringOption(opt => opt.setName('isim').setDescription('Takım Adı').setRequired(true)),

    new SlashCommandBuilder().setName('takim-sec').setDescription('Boştaki bir takımın Teknik Direktörü (T.D.) olursunuz.')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Seçmek istediğiniz takımın adı').setRequired(true)),

    new SlashCommandBuilder().setName('takimlar').setDescription('Ligdeki tüm takımları, bütçelerini ve T.D. durumlarını listeler.'),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Ligdeki güncel puan durumunu gösterir.'),

    new SlashCommandBuilder().setName('gol-kralligi').setDescription('En çok gol atan oyuncuları listeler.'),

    new SlashCommandBuilder().setName('transfer').setDescription('Takımınıza bir oyuncuyu transfer edin.')
        .addUserOption(opt => opt.setName('oyuncu').setDescription('Transfer edilecek oyuncu').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Ödenecek bonservis bedeli (€)').setRequired(true)),

    new SlashCommandBuilder().setName('sponsor').setDescription('Takımınız için sponsorluk geliri alırsınız (3 saatte bir).'),

    new SlashCommandBuilder().setName('butce').setDescription('Takımınızın bütçesini görüntüler.'),

    new SlashCommandBuilder().setName('profil').setDescription('Oyuncu profilini görüntüler.')
        .addUserOption(opt => opt.setName('hedef').setDescription('Profili görüntülenecek oyuncu')),

    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Otomatik lig sezonunu rastgele eşleşmelerle başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('sezon-durdur').setDescription('Devam eden lig sezonunu ve maçları durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('mac-oyna').setDescription('Tekil canlı spikerli maç başlatır.')
        .addStringOption(opt => opt.setName('ev-sahibi').setDescription('Ev Sahibi Takım').setRequired(true))
        .addStringOption(opt => opt.setName('deplasman').setDescription('Deplasman Takımı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('para-ver').setDescription('Bir oyuncuya veya takıma para verir (Yönetici).')
        .addUserOption(opt => opt.setName('hedef').setDescription('Para verilecek kullanıcı').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('cezalandir').setDescription('Oyuncuyu sakatlar veya cezalı yapar (Yönetici).')
        .addUserOption(opt => opt.setName('oyuncu').setDescription('Hedef oyuncu').setRequired(true))
        .addStringOption(opt => opt.setName('tur').setDescription('Tür (sakatlik / ceza)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('lig-sifirla').setDescription('Tüm lig verilerini, puanları ve fikstürü sıfırlar (Yönetici).')
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
    if (!db.oyuncular) db.oyuncular = {};
    const tumu = Object.values(db.oyuncular).filter(o => !o.sakatlik && !o.cezali);
    if (tumu.length > 0) {
        return tumu[Math.floor(Math.random() * tumu.length)];
    }
    return { name: "Bilinmeyen Oyuncu", id: null };
}

let aktifMacInterval = null;

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

        aktifMacInterval = setInterval(async () => {
            if (!db.sezonAktif) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
                await channel.send(`🛑 **MAÇ DURDURULDU!** Sezon durdurulduğu için karşılaşma yarıda kesildi.`).catch(() => {});
                resolve(false);
                return;
            }

            mevcutDakika += Math.floor(Math.random() * 4) + 3;

            if (mevcutDakika >= 45 && !ilkYariBitti && mevcutDakika < 90) {
                ilkYariBitti = true;
                await channel.send(`⏸️ **İLK YARI BİTTİ!** | Skor: **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`).catch(() => {});
                return;
            }

            if (mevcutDakika >= 90) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
                const bitisEmbed = new EmbedBuilder()
                    .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                    .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                    .setColor('#2ecc71')
                    .setTimestamp();

                await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor);
                resolve(true);
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

                if (secilenOyuncu && secilenOyuncu.id && db.oyuncular[secilenOyuncu.id]) {
                    db.oyuncular[secilenOyuncu.id].gol = (db.oyuncular[secilenOyuncu.id].gol || 0) + 1;
                    veriyiKaydet();
                }
            } else if (secilenOlay.tip === "sakatlik" && secilenOyuncu.id && db.oyuncular[secilenOyuncu.id]) {
                db.oyuncular[secilenOyuncu.id].sakatlik = true;
                veriyiKaydet();
            } else if (secilenOlay.tip === "kirmizi" && secilenOyuncu.id && db.oyuncular[secilenOyuncu.id]) {
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
    if (!db.takimlar[keyEv] || !db.takimlar[keyDep]) return;

    let tEv = db.takimlar[keyEv];
    let tDep = db.takimlar[keyDep];

    tEv.o++; tDep.o++;
    tEv.av += (evSkor - depSkor);
    tDep.av += (depSkor - evSkor);

    if (evSkor > depSkor) {
        tEv.puan += 3; tEv.g++; tDep.m++;
        tEv.butce += 50000;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++; tEv.m++;
        tEv.butce += 50000;
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

        if (!db.oyuncular) db.oyuncular = {};
        if (!db.takimlar) db.takimlar = {};

        if (commandName === 'otomatik-takimlar') {
            const eklenen = otomatikTakimlariYukle();
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle('⚽ Ünlü Takımlar Yüklendi').setDescription(`Sisteme **${eklenen}** adet yeni takım eklendi.`).setColor('#2ecc71')]
            });
        }

        if (commandName === 'kayit') {
            if (KAYIT_YETKILI_ROL_ID !== 'BURAYA_KAYIT_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(KAYIT_YETKILI_ROL_ID)) {
                return interaction.reply({ content: "❌ Kayıt Yetkilisi olmalısın!", ephemeral: true });
            }
            const hedefKullanici = options.getUser('kisi');
            const hedefMember = await guild.members.fetch(hedefKullanici.id).catch(() => null);
            const yeniIsim = options.getString('isim');
            const mevki = options.getString('mevki').toUpperCase();

            db.oyuncular[hedefKullanici.id] = { id: hedefKullanici.id, name: yeniIsim, mevki, piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            veriyiKaydet();
            if (hedefMember) await isimGuncelle(guild, hedefMember, yeniIsim, mevki, 1);

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Kayıt Başarılı').setDescription(`<@${hedefKullanici.id}> kaydedildi.`).setColor('#2ecc71')] });
        }

        if (commandName === 'dver') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ content: "❌ Değer Yetkilisi olmalısın!", ephemeral: true });
            }
            const hedefKullanici = options.getUser('kisi');
            const eklenecekDeger = options.getInteger('miktar');
            if (!db.oyuncular[hedefKullanici.id]) db.oyuncular[hedefKullanici.id] = { id: hedefKullanici.id, name: hedefKullanici.username, mevki: 'SNT', piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            
            const o = db.oyuncular[hedefKullanici.id];
            o.piyasaDegeri += eklenecekDeger;
            veriyiKaydet();
            const hm = await guild.members.fetch(hedefKullanici.id).catch(() => null);
            if (hm) await isimGuncelle(guild, hm, o.name, o.mevki, o.piyasaDegeri);

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ Değer Arttırıldı').setDescription(`Yeni Değer: **${o.piyasaDegeri}M€**`).setColor('#3498db')] });
        }

        if (commandName === 'dal') {
            if (DEGER_YETKILI_ROL_ID !== 'BURAYA_DEGER_YETKILISI_ROL_ID_YAZ' && !member.roles.cache.has(DEGER_YETKILI_ROL_ID)) {
                return interaction.reply({ content: "❌ Değer Yetkilisi olmalısın!", ephemeral: true });
            }
            const hedefKullanici = options.getUser('kisi');
            const dusurulecekDeger = options.getInteger('miktar');
            if (!db.oyuncular[hedefKullanici.id]) db.oyuncular[hedefKullanici.id] = { id: hedefKullanici.id, name: hedefKullanici.username, mevki: 'SNT', piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            
            const o = db.oyuncular[hedefKullanici.id];
            o.piyasaDegeri = Math.max(1, o.piyasaDegeri - dusurulecekDeger);
            veriyiKaydet();
            const hm = await guild.members.fetch(hedefKullanici.id).catch(() => null);
            if (hm) await isimGuncelle(guild, hm, o.name, o.mevki, o.piyasaDegeri);

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔻 Değer Düşürüldü').setDescription(`Yeni Değer: **${o.piyasaDegeri}M€**`).setColor('#e74c3c')] });
        }

        if (commandName === 'antrenman') {
            if (!db.oyuncular[user.id]) db.oyuncular[user.id] = { id: user.id, name: user.username, mevki: 'SNT', piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            const o = db.oyuncular[user.id];
            const simdi = Date.now();
            if (simdi - (o.sonAntrenman || 0) < 3600000) {
                const kalanDk = Math.ceil((3600000 - (simdi - o.sonAntrenman)) / 60000);
                return interaction.reply({ content: `⏳ Antrenman için **${kalanDk} dakika** beklemelisin.`, ephemeral: true });
            }
            const kazanc = Math.floor(Math.random() * 7) + 1;
            o.piyasaDegeri += kazanc;
            o.sonAntrenman = simdi;
            o.sakatlik = false;
            o.cezali = false;
            veriyiKaydet();
            const hm = await guild.members.fetch(user.id).catch(() => null);
            if (hm) await isimGuncelle(guild, hm, o.name, o.mevki, o.piyasaDegeri);

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏋️‍♂️ Antrenman Tamamlandı').setDescription(`+${kazanc}M€ kazandın. Yeni değer: **${o.piyasaDegeri}M€**`).setColor('#f39c12')] });
        }

        if (commandName === 'kart' || commandName === 'profil') {
            const target = options.getUser('hedef') || user;
            if (!db.oyuncular[target.id]) db.oyuncular[target.id] = { id: target.id, name: target.username, mevki: 'SNT', piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            const p = db.oyuncular[target.id];
            const status = p.sakatlik ? '🚑 Sakat' : (p.cezali ? '🟥 Cezalı' : '✅ Aktif');

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🎴 OYUNCU KARTI | ${p.name}`).setColor('#f1c40f').addFields(
                { name: '💰 Piyasa Değeri', value: `${p.piyasaDegeri}M€`, inline: true },
                { name: '📍 Mevki', value: p.mevki, inline: true },
                { name: '🛡️ Takım', value: p.takim, inline: true },
                { name: '⚽ Gol', value: `${p.gol || 0}`, inline: true },
                { name: '📌 Durum', value: status, inline: true }
            )] });
        }

        if (commandName === 'takimlar') {
            const takimlar = Object.values(db.takimlar);
            if (takimlar.length === 0) return interaction.reply({ content: '❌ Kayıtlı takım yok.', ephemeral: true });
            let liste = "";
            takimlar.forEach((t, i) => {
                const tdBilgi = t.kurucu && t.kurucu !== "Sistem" ? `<@${t.kurucu}>` : "Boşta";
                liste += `**${i + 1}. ${t.isim}** | T.D: ${tdBilgi} | Bütçe: €${t.butce.toLocaleString()}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ TAKIMLAR VE T.D.').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'takim-sec') {
            const girilenIsim = options.getString('takim-adi').trim().toLowerCase();
            const ztnBaskasi = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (ztnBaskasi) return interaction.reply({ content: `❌ Zaten **${ztnBaskasi.isim}** takımının T.D.sisin!`, ephemeral: true });

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenIsim || db.takimlar[k].isim.toLowerCase().includes(girilenIsim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Takım bulunamadı!', ephemeral: true });

            const secilenTakim = db.takimlar[bulunanKey];
            if (secilenTakim.kurucu && secilenTakim.kurucu !== "Sistem") return interaction.reply({ content: '❌ Bu takımın zaten bir T.D.si var!', ephemeral: true });

            secilenTakim.kurucu = user.id;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Artık **${secilenTakim.isim}** teknik direktörüsün.`).setColor('#2ecc71')] });
        }

        if (commandName === 'gol-kralligi') {
            const oyuncular = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            if (oyuncular.length === 0) return interaction.reply({ content: 'Gol atan oyuncu yok.', ephemeral: true });
            let liste = "";
            oyuncular.forEach((o, i) => { liste += `**${i + 1}. ${o.name}** - **${o.gol} Gol**\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(liste).setColor('#e67e22')] });
        }

        if (commandName === 'transfer') {
            const hedefOyuncu = options.getUser('oyuncu');
            const bonservis = options.getInteger('bonservis');
            if (!db.oyuncular[hedefOyuncu.id]) db.oyuncular[hedefOyuncu.id] = { id: hedefOyuncu.id, name: hedefOyuncu.username, mevki: 'SNT', piyasaDegeri: 1, gol: 0, sakatlik: false, cezali: false, takim: 'Serbest Oyuncu', sonAntrenman: 0 };
            
            const od = db.oyuncular[hedefOyuncu.id];
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', ephemeral: true });
            if (kulup.butce < bonservis) return interaction.reply({ content: '❌ Kulüp bütçesi yetersiz!', ephemeral: true });

            kulup.butce -= bonservis;
            od.takim = kulup.isim;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 TRANSFER!').setDescription(`${od.name}, ${kulup.isim} takımına transfer oldu.`).setColor('#2ecc71')] });
        }

        if (commandName === 'sponsor') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. olmalısın.', ephemeral: true });
            const simdi = Date.now();
            if (simdi - (kulup.sonSponsor || 0) < 10800000) return interaction.reply({ content: '⏳ Sponsor için süre henüz dolmadı.', ephemeral: true });

            const gelir = Math.floor(Math.random() * 50000) + 50000;
            kulup.butce += gelir;
            kulup.sonSponsor = simdi;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR GELİRİ!').setDescription(`Kutlarım! Kasaya €${gelir.toLocaleString()} eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. değilsin.', ephemeral: true });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe: ${kulup.isim}`).setDescription(`Kasa: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'takim-olustur') {
            const takimIsmi = options.getString('isim');
            const key = takimIsmi.toLowerCase();
            if (Object.values(db.takimlar).some(t => t.kurucu === user.id)) return interaction.reply({ content: '❌ Zaten bir takımın var!', ephemeral: true });
            if (db.takimlar[key]) return interaction.reply({ content: '❌ Bu isimde takım var!', ephemeral: true });

            db.takimlar[key] = { isim: takimIsmi, kurucu: user.id, puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0, butce: 100000, sonSponsor: 0 };
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ Takım Kuruldu').setDescription(`${takimIsmi} oluşturuldu.`).setColor('#f1c40f')] });
        }

        if (commandName === 'puan-durumu') {
            const takimlar = Object.values(db.takimlar).sort((a, b) => b.puan - a.puan || b.av - a.av);
            if (takimlar.length === 0) return interaction.reply({ content: '❌ Takım yok.', ephemeral: true });
            let liste = "";
            takimlar.forEach((t, i) => { liste += `**${i + 1}. ${t.isim}** | O: ${t.o} | Puan: ${t.puan}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            let takimListesi = Object.values(db.takimlar);
            if (takimListesi.length < 2) return interaction.reply({ content: '❌ En az 2 takım olmalı!', ephemeral: true });

            // Takımları rastgele karıştır (Fisher-Yates algoritması)
            for (let i = takimListesi.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [takimListesi[i], takimListesi[j]] = [takimListesi[j], takimListesi[i]];
            }

            db.sezonAktif = true;
            veriyiKaydet();
            await interaction.reply({ content: `🚀 **SEZON BAŞLADI!** Takımlar rastgele eşleştirildi, maçlar oynanıyor.` });

            for (let i = 0; i < takimListesi.length; i++) {
                for (let j = i + 1; j < takimListesi.length; j++) {
                    if (!db.sezonAktif) break;
                    const ev = takimListesi[i].isim;
                    const dep = takimListesi[j].isim;

                    await channel.send(`📢 **SIRADAKİ MAÇ:** **${ev} vs ${dep}**`);
                    const sonuc = await canliMacOyna(channel, ev, dep);
                    if (!sonuc) break;
                    await new Promise(r => setTimeout(r, 4000));
                }
                if (!db.sezonAktif) break;
            }

            if (db.sezonAktif) {
                db.sezonAktif = false;
                veriyiKaydet();
                await channel.send({ embeds: [new EmbedBuilder().setTitle('🎉 SEZON TAMAMLANDI!').setDescription('Tüm lig maçları bitti.').setColor('#2ecc71')] });
            }
        }

        if (commandName === 'sezon-durdur') {
            if (!db.sezonAktif) {
                return interaction.reply({ content: '⚠️ Zaten aktif bir sezon veya oynanan maç bulunmuyor.', ephemeral: true });
            }

            db.sezonAktif = false;
            veriyiKaydet();

            if (aktifMacInterval) {
                clearInterval(aktifMacInterval);
                aktifMacInterval = null;
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🛑 SEZON VE MAÇLAR DURDURULDU!')
                        .setDescription('Yönetici komutuyla devam eden lig sezonu ve aktif canlı maçlar durduruldu.')
                        .setColor('#e74c3c')
                ]
            });
        }

        if (commandName === 'mac-oyna') {
            const ev = options.getString('ev-sahibi');
            const dep = options.getString('deplasman');
            db.sezonAktif = true;
            veriyiKaydet();
            await interaction.reply({ content: `⏳ **${ev} vs ${dep}** maçı başlatılıyor...` });
            await canliMacOyna(channel, ev, dep);
        }

        if (commandName === 'para-ver') {
            const hedef = options.getUser('hedef');
            const miktar = options.getInteger('miktar');
            const kulup = Object.values(db.takimlar).find(t => t.kurucu === hedef.id);
            if (kulup) {
                kulup.butce += miktar;
                veriyiKaydet();
                return interaction.reply({ content: `✅ <@${hedef.id}> takımının kasasına €${miktar.toLocaleString()} eklendi.` });
            } else {
                return interaction.reply({ content: `❌ Belirtilen kullanıcının yönettiği bir takım bulunamadı.`, ephemeral: true });
            }
        }

        if (commandName === 'cezalandir') {
            const hedefOyuncu = options.getUser('oyuncu');
            const tur = options.getString('tur').toLowerCase();
            if (!db.oyuncular[hedefOyuncu.id]) {
                return interaction.reply({ content: `❌ Bu oyuncu veritabanında kayıtlı değil.`, ephemeral: true });
            }
            if (tur === 'sakatlik') {
                db.oyuncular[hedefOyuncu.id].sakatlik = true;
            } else if (tur === 'ceza') {
                db.oyuncular[hedefOyuncu.id].cezali = true;
            }
            veriyiKaydet();
            return interaction.reply({ content: `✅ <@${hedefOyuncu.id}> başarıyla cezalandırıldı (${tur}).` });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => {
                t.puan = 0;
                t.av = 0;
                t.o = 0;
                t.g = 0;
                t.b = 0;
                t.m = 0;
            });
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🔄 LİG SIFIRLANDI').setDescription('Tüm takım puanları ve fikstür istatistikleri sıfırlandı.').setColor('#e74c3c')] });
        }

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCORD_TOKEN);
