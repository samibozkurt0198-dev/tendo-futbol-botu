const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType 
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

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
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const DB_FILE = './database.json';
let db = {
    oyuncular: {},
    takimlar: {},
    transferPazari: {},
    sezonAktif: false,
    transferKanalId: null
};

if (fs.existsSync(DB_FILE)) {
    try {
        const dosyaVerisi = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (dosyaVerisi.oyuncular) db.oyuncular = dosyaVerisi.oyuncular;
        if (dosyaVerisi.takimlar) db.takimlar = dosyaVerisi.takimlar;
        if (dosyaVerisi.transferPazari) db.transferPazari = dosyaVerisi.transferPazari;
        if (dosyaVerisi.sezonAktif !== undefined) db.sezonAktif = dosyaVerisi.sezonAktif;
        if (dosyaVerisi.transferKanalId) db.transferKanalId = dosyaVerisi.transferKanalId;
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

const UNLU_TAKIMLAR = [
    "Galatasaray", "Fenerbahçe", "Beşiktaş", "Trabzonspor",
    "Real Madrid", "Barcelona", "Manchester City", "Arsenal",
    "Liverpool", "Manchester United", "Bayern München", "Borussia Dortmund",
    "Paris Saint-Germain", "Inter", "AC Milan", "Juventus",
    "Atletico Madrid", "Chelsea", "Napoli", "Benfica"
];

const GUNCEL_FUTBOLCULAR = [
    { isim: "Kylian Mbappe", mevki: "SNT", deger: 180 },
    { isim: "Erling Haaland", mevki: "SNT", deger: 175 },
    { isim: "Jude Bellingham", mevki: "OS", deger: 160 },
    { isim: "Vinicius Junior", mevki: "KANAT", deger: 150 },
    { isim: "Bukayo Saka", mevki: "KANAT", deger: 130 },
    { isim: "Phil Foden", mevki: "OS", deger: 125 },
    { isim: "Florian Wirtz", mevki: "OS", deger: 120 },
    { isim: "Jamal Musiala", mevki: "OS", deger: 120 },
    { isim: "Rodri", mevki: "OS", deger: 110 },
    { isim: "Declan Rice", mevki: "OS", deger: 100 },
    { isim: "Federico Valverde", mevki: "OS", deger: 100 },
    { isim: "Lamine Yamal", mevki: "KANAT", deger: 110 },
    { isim: "Martin Odegaard", mevki: "OS", deger: 95 },
    { isim: "Lautaro Martinez", mevki: "SNT", deger: 95 },
    { isim: "Harry Kane", mevki: "SNT", deger: 90 },
    { isim: "William Saliba", mevki: "STP", deger: 85 },
    { isim: "Ruben Dias", mevki: "STP", deger: 80 },
    { isim: "Thibaut Courtois", mevki: "KL", deger: 75 },
    { isim: "Alisson Becker", mevki: "KL", deger: 70 },
    { isim: "Marc-Andre ter Stegen", mevki: "KL", deger: 65 },
    { isim: "Cole Palmer", mevki: "OS", deger: 90 },
    { isim: "Rodrygo", mevki: "KANAT", deger: 90 },
    { isim: "Victor Osimhen", mevki: "SNT", deger: 90 },
    { isim: "Khvicha Kvaratskhelia", mevki: "KANAT", deger: 85 },
    { isim: "Alexis Mac Allister", mevki: "OS", deger: 75 },
    { isim: "Antonio Rüdiger", mevki: "STP", deger: 60 },
    { isim: "Virgil van Dijk", mevki: "STP", deger: 55 },
    { isim: "Bruno Fernandes", mevki: "OS", deger: 70 },
    { isim: "Son Heung-min", mevki: "KANAT", deger: 65 },
    { isim: "Kevin De Bruyne", mevki: "OS", deger: 70 },
    { isim: "Mohamed Salah", mevki: "KANAT", deger: 75 },
    { isim: "Antoine Griezmann", mevki: "SNT", deger: 50 },
    { isim: "Paulo Dybala", mevki: "OS", deger: 45 },
    { isim: "Rafael Leao", mevki: "KANAT", deger: 85 },
    { isim: "Theo Hernandez", mevki: "DF", deger: 75 },
    { isim: "Achraf Hakimi", mevki: "DF", deger: 70 },
    { isim: "Alessandro Bastoni", mevki: "STP", deger: 75 },
    { isim: "Ederson", mevki: "KL", deger: 65 },
    { isim: "Mike Maignan", mevki: "KL", deger: 70 },
    { isim: "Arda Güler", mevki: "OS", deger: 45 },
    { isim: "Kenan Yıldız", mevki: "KANAT", deger: 40 },
    { isim: "Barış Alper Yılmaz", mevki: "KANAT", deger: 25 },
    { isim: "Kerem Aktürkoğlu", mevki: "KANAT", deger: 22 },
    { isim: "Ferdi Kadıoğlu", mevki: "DF", deger: 30 },
    { isim: "Hakan Çalhanoğlu", mevki: "OS", deger: 45 },
    { isim: "Orkun Kökçü", mevki: "OS", deger: 28 },
    { isim: "Semih Kılıçsoy", mevki: "SNT", deger: 20 },
    { isim: "Victor Boniface", mevki: "SNT", deger: 45 },
    { isim: "Jeremie Frimpong", mevki: "DF", deger: 50 },
    { isim: "Alejandro Garnacho", mevki: "KANAT", deger: 50 },
    { isim: "Kobbie Mainoo", mevki: "OS", deger: 55 },
    { isim: "Endrick", mevki: "SNT", deger: 60 },
    { isim: "Xavi Simons", mevki: "OS", deger: 75 },
    { isim: "Benjamin Sesko", mevki: "SNT", deger: 50 },
    { isim: "Joshua Zirkzee", mevki: "SNT", deger: 40 },
    { isim: "Joao Neves", mevki: "OS", deger: 60 },
    { isim: "Leny Yoro", mevki: "STP", deger: 50 },
    { isim: "Ousmane Dembele", mevki: "KANAT", deger: 60 },
    { isim: "Gianluigi Donnarumma", mevki: "KL", deger: 40 },
    { isim: "Julian Alvarez", mevki: "SNT", deger: 90 },
    { isim: "Eduardo Camavinga", mevki: "OS", deger: 90 },
    { isim: "Aurelien Tchouameni", mevki: "OS", deger: 85 },
    { isim: "Federico Dimarco", mevki: "DF", deger: 50 },
    { isim: "Bremer", mevki: "STP", deger: 60 },
    { isim: "Jan Oblak", mevki: "KL", deger: 35 },
    { isim: "Manuel Neuer", mevki: "KL", deger: 10 },
    { isim: "Robert Lewandowski", mevki: "SNT", deger: 15 },
    { isim: "Karim Benzema", mevki: "SNT", deger: 10 },
    { isim: "N'Golo Kante", mevki: "OS", deger: 10 },
    { isim: "Sadio Mane", mevki: "KANAT", deger: 15 },
    { isim: "Riyad Mahrez", mevki: "KANAT", deger: 12 },
    { isim: "Bernardo Silva", mevki: "OS", deger: 70 },
    { isim: "Jack Grealish", mevki: "KANAT", deger: 55 },
    { isim: "John Stones", mevki: "STP", deger: 38 },
    { isim: "Kyle Walker", mevki: "DF", deger: 15 },
    { isim: "Moises Caicedo", mevki: "OS", deger: 75 },
    { isim: "Enzo Fernandez", mevki: "OS", deger: 75 },
    { isim: "Christopher Nkunku", mevki: "OS", deger: 65 },
    { isim: "Dusan Vlahovic", mevki: "SNT", deger: 65 },
    { isim: "Federico Chiesa", mevki: "KANAT", deger: 35 },
    { isim: "Marcus Rashford", mevki: "KANAT", deger: 60 },
    { isim: "Mason Mount", mevki: "OS", deger: 35 },
    { isim: "Lisandro Martinez", mevki: "STP", deger: 50 },
    { isim: "Andre Onana", mevki: "KL", deger: 35 },
    { isim: "Darwin Nunez", mevki: "SNT", deger: 70 },
    { isim: "Dominik Szoboszlai", mevki: "OS", deger: 75 },
    { isim: "Diogo Jota", mevki: "SNT", deger: 40 },
    { isim: "Ibrahima Konate", mevki: "STP", deger: 45 },
    { isim: "Trent Alexander-Arnold", mevki: "DF", deger: 70 },
    { isim: "Andrew Robertson", mevki: "DF", deger: 30 },
    { isim: "Gabriel Magalhaes", mevki: "STP", deger: 70 },
    { isim: "Jurrien Timber", mevki: "DF", deger: 40 },
    { isim: "Kai Havertz", mevki: "SNT", deger: 75 },
    { isim: "Gabriel Jesus", mevki: "SNT", deger: 65 },
    { isim: "Gabriel Martinelli", mevki: "KANAT", deger: 70 },
    { isim: "Viktor Gyokeres", mevki: "SNT", deger: 70 },
    { isim: "Ollie Watkins", mevki: "SNT", deger: 65 },
    { isim: "Emiliano Martinez", mevki: "KL", deger: 28 },
    { isim: "Ezri Konsa", mevki: "STP", deger: 30 },
    { isim: "Micky van de Ven", mevki: "STP", deger: 55 },
    { isim: "Destiny Udogie", mevki: "DF", deger: 45 },
    { isim: "James Maddison", mevki: "OS", deger: 60 },
    { isim: "Dejan Kulusevski", mevki: "KANAT", deger: 55 },
    { isim: "Guglielmo Vicario", mevki: "KL", deger: 35 },
    { isim: "Lucas Paqueta", mevki: "OS", deger: 65 },
    { isim: "Jarrod Bowen", mevki: "KANAT", deger: 50 },
    { isim: "Mohammed Kudus", mevki: "KANAT", deger: 50 }
];

function otomatikTakimlariVeFutbolculariYukle() {
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
                butce: 150000000,
                sonSponsor: 0
            };
        }
    });

    if (!db.oyuncular || Object.keys(db.oyuncular).length === 0) {
        db.oyuncular = {};
        GUNCEL_FUTBOLCULAR.forEach((f, index) => {
            const id = `oyuncu_${index + 1}`;
            const maas = Math.floor(f.deger * 25000);
            db.oyuncular[id] = {
                id: id,
                name: f.isim,
                mevki: f.mevki,
                piyasaDegeri: f.deger,
                maas: maas,
                gol: 0,
                sakatlik: 0,
                cezali: 0,
                takim: 'Serbest'
            };
        });
    }
    veriyiKaydet();
}

function kullanicininTakiminiBul(userId) {
    const temizId = String(userId).trim();
    return Object.values(db.takimlar).find(t => t.kurucu && String(t.kurucu).trim() === temizId);
}

const commands = [
    new SlashCommandBuilder()
        .setName('kayıt')
        .setDescription('Bir kullanıcıyı kayıt eder ve adını günceller.')
        .addUserOption(opt => opt.setName('kullanici').setDescription('Kayıt edilecek kişi').setRequired(true))
        .addStringOption(opt => opt.setName('isim').setDescription('Kullanıcının yeni adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('yas').setDescription('Kullanıcının yaşı').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    new SlashCommandBuilder()
        .setName('futbolcu-havuzu')
        .setDescription('Transfer edilebilir güncel futbolcuları listeler.')
        .addIntegerOption(opt => opt.setName('sayfa').setDescription('Sayfa numarası')),

    new SlashCommandBuilder()
        .setName('transfer-teklif')
        .setDescription('Serbest veya başka takımdaki bir oyuncuya teklif yaparsınız.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Bonservis (Milyon €)').setRequired(true))
        .addIntegerOption(opt => opt.setName('haftalik-maas').setDescription('Haftalık maaş (€)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-kabul')
        .setDescription('Gelen karşı teklifi onaylar.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-red')
        .setDescription('Transfer teklifini reddeder.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-karsi-teklif')
        .setDescription('Futbolcu için yeni bir bonservis teklif edersiniz.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Yeni Bonservis (Milyon €)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('serbest-birak')
        .setDescription('Kadronuzdaki bir futbolcuyu serbest bırakırsınız.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfermarkt-kanal-ayarla')
        .setDescription('Transfer duyuru kanalını ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('takimlar').setDescription('Ligdeki tüm takımları listeler.'),
    new SlashCommandBuilder().setName('takim-sec').setDescription('Bir takımın Teknik Direktörü olursunuz.')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('mac-yap')
        .setDescription('Canlı maç yaparsınız.')
        .addStringOption(opt => opt.setName('rakip-takim').setDescription('Rakip takım adı').setRequired(true)),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Puan durumunu gösterir.'),
    new SlashCommandBuilder().setName('gol-kralligi').setDescription('Gol krallığını listeler.'),
    new SlashCommandBuilder().setName('kadrom').setDescription('Takımınızdaki futbolcuları gösterir.'),
    new SlashCommandBuilder().setName('sponsor').setDescription('Sponsorluk geliri alırsınız.'),
    new SlashCommandBuilder().setName('butce').setDescription('Bütçenizi görüntüler.'),
    
    new SlashCommandBuilder()
        .setName('butce-ver')
        .setDescription('Takıma bütçe ekler (Yönetici).')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar (Milyon €)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('gol-sesi-kanal').setDescription('Gol ses kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Ses Kanalı').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Lig sezonunu başlatır.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sezon-durdur').setDescription('Lig sezonunu durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('lig-sifirla').setDescription('Ligi sıfırlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);

client.once('ready', async () => {
    console.log(`Bot ${client.user.tag} olarak giriş yaptı!`);
    otomatikTakimlariVeFutbolculariYukle();

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
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} yıldızı **{oyuncu}** tribünleri coşturan harika bir gol attı! Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} atağında **{oyuncu}** şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** {hücum} oyuncusu **{oyuncu}** sert vurdu, top az farkla auta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** {hücum} köşe vuruşu kazandı, tehlikeli orta geliyor.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** {hücum} atağında **{oyuncu}** vurdu, sert şut direkten patladı!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} takımından sert müdahale.", tip: "normal" }
];

function rastgeleFutbolcuSec() {
    if (!db.oyuncular) db.oyuncular = {};
    const tumu = Object.values(db.oyuncular).filter(o => !o.sakatlik && !o.cezali);
    if (tumu.length > 0) {
        return tumu[Math.floor(Math.random() * tumu.length)];
    }
    return { name: "Bilinmeyen Futbolcu", id: null };
}

let golKanalId = null;

async function golSesiCal(guild) {
    if (!golKanalId) return;
    try {
        const channel = await guild.channels.fetch(golKanalId).catch(() => null);
        if (!channel || channel.type !== ChannelType.GuildVoice) return;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        setTimeout(() => { try { connection.destroy(); } catch(e){} }, 4000);
    } catch(e) {}
}

async function transferDuyurusuGonder(guild, takimIsmi, oyuncuAdi, bonservisMilyon, maas) {
    if (!db.transferKanalId) return;
    try {
        const kanal = await guild.channels.fetch(db.transferKanalId).catch(() => null);
        if (!kanal || kanal.type !== ChannelType.GuildText) return;

        const embed = new EmbedBuilder()
            .setTitle('🔥 TRANSFERMARKT | YENİ TRANSFER!')
            .setDescription(`📈 **${takimIsmi}**, yıldız futbolcu **${oyuncuAdi}** ile anlaşmaya varıldığını duyurdu!`)
            .addFields(
                { name: '⚽ Futbolcu', value: oyuncuAdi, inline: true },
                { name: '🏛️ Yeni Takımı', value: takimIsmi, inline: true },
                { name: '💰 Bonservis', value: `${bonservisMilyon}M €`, inline: true },
                { name: '💶 Haftalık Maaş', value: `€${maas.toLocaleString()}`, inline: true }
            )
            .setColor('#e67e22')
            .setTimestamp();

        await kanal.send({ embeds: [embed] }).catch(() => {});
    } catch (e) {
        console.error("Transfer duyuru hatası:", e);
    }
}

function tekilCanliMacOyna(channel, evSahibi, deplasman, guild) {
    return new Promise(async (resolve) => {
        let evSkor = 0;
        let depSkor = 0;
        let mevcutDakika = 1;
        let ilkYariBitti = false;

        const baslangicEmbed = new EmbedBuilder()
            .setTitle(`🎙️ MAÇ | ${evSahibi} vs ${deplasman}`)
            .setDescription(`Karşılaşma hakemin düdüğüyle başladı!`)
            .setColor('#e74c3c');

        await channel.send({ embeds: [baslangicEmbed] }).catch(() => {});

        const macInterval = setInterval(async () => {
            if (!db.sezonAktif) {
                clearInterval(macInterval);
                await channel.send(`🛑 Maç durduruldu!`).catch(() => {});
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
                clearInterval(macInterval);
                const bitisEmbed = new EmbedBuilder()
                    .setTitle(`🏁 MAÇ BİTTİ! | ${evSahibi} vs ${deplasman}`)
                    .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                    .setColor('#2ecc71');

                await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor);
                resolve(true);
                return;
            }

            let secilenOlay;
            const sans = Math.random();
            if (sans < 0.18) { 
                const goller = olaylar.filter(o => o.tip === "gol");
                secilenOlay = goller[Math.floor(Math.random() * goller.length)];
            } else { 
                const normaller = olaylar.filter(o => o.tip === "normal");
                secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
            }

            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;
            const secilenFutbolcu = rastgeleFutbolcuSec();

            if (secilenOlay.tip === "gol") {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;

                if (secilenFutbolcu && secilenFutbolcu.id && db.oyuncular[secilenFutbolcu.id]) {
                    db.oyuncular[secilenFutbolcu.id].gol = (db.oyuncular[secilenFutbolcu.id].gol || 0) + 1;
                    veriyiKaydet();
                }
                if (guild) golSesiCal(guild);
            }

            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = secilenOlay.metin
                .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{oyuncu}', secilenFutbolcu.name)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});

        }, 5000);
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
        tEv.butce += 2000000;
    } else if (depSkor > evSkor) {
        tDep.puan += 3; tDep.g++; tEv.m++;
        tDep.butce += 2000000;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
        tEv.butce += 1000000; tDep.butce += 1000000;
    }
    veriyiKaydet();
}

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    try {
        const { commandName, options, user, channel, guild } = interaction;
        if (!db.oyuncular) db.oyuncular = {};
        if (!db.takimlar) db.takimlar = {};

        if (commandName === 'kayıt') {
            const hedefUye = options.getMember('kullanici');
            const yeniIsim = options.getString('isim');
            const yas = options.getInteger('yas');

            if (!hedefUye) return interaction.reply({ content: '❌ Geçerli bir kullanıcı belirtmelisin!', flags: 64 });

            await hedefUye.setNickname(`${yeniIsim} | ${yas}`);
            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle('✅ BAŞARILI KAYIT')
                    .setDescription(`**${hedefUye.user.tag}** başarıyla kayıt edildi!\n📝 **Yeni İsim:** ${yeniIsim} | ${yas}`)
                    .setColor('#2ecc71')
                ] 
            });
        }

        if (commandName === 'futbolcu-havuzu') {
            const sayfa = options.getInteger('sayfa') || 1;
            const oyuncular = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
            const limit = 20;
            const maxSayfa = Math.ceil(oyuncular.length / limit) || 1;
            
            if (sayfa < 1 || sayfa > maxSayfa) {
                return interaction.reply({ content: `❌ Geçersiz sayfa! 1 ile ${maxSayfa} arasında bir sayı gir.`, flags: 64 });
            }

            const baslangic = (sayfa - 1) * limit;
            const listeSlices = oyuncular.slice(baslangic, baslangic + limit);
            
            let liste = "";
            listeSlices.forEach((f, i) => {
                liste += `**${baslangic + i + 1}. ${f.name}** | Mevki: **${f.mevki}** | Değer: **${f.piyasaDegeri}M€** | Maaş: **€${f.maas.toLocaleString()}**\n`;
            });

            return interaction.reply({ 
                embeds: [new EmbedBuilder()
                    .setTitle(`📋 TRANSFER HAVUZU (Sayfa ${sayfa}/${maxSayfa})`)
                    .setDescription(liste)
                    .setColor('#3498db')
                ] 
            });
        }

        if (commandName === 'transfermarkt-kanal-ayarla') {
            const kanal = options.getChannel('kanal');
            db.transferKanalId = kanal.id;
            veriyiKaydet();
            return interaction.reply({ content: `✅ Transfermarkt duyuru kanalı <#${kanal.id}> olarak ayarlandı!`, flags: 64 });
        }

        if (commandName === 'serbest-birak') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi) && f.takim === kulup.isim);

            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Kadronuzda bu isimde bir futbolcu bulunamadı!', flags: 64 });

            hedefFutbolcu.takim = 'Serbest';
            veriyiKaydet();

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🚪 OYUNCU SERBEST BIRAKILDI')
                    .setDescription(`**${hedefFutbolcu.name}**, **${kulup.isim}** tarafından serbest bırakıldı ve transfer havuzuna eklendi.`)
                    .setColor('#e74c3c')
                ]
            });
        }

        if (commandName === 'transfer-teklif') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const mevcutFutbolcular = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (mevcutFutbolcular.length >= 16) {
                return interaction.reply({ content: '❌ Kadronuzda en fazla 16 oyuncu bulunabilir.', flags: 64 });
            }

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const bonservisMilyon = options.getInteger('bonservis');
            const haftalikMaas = options.getInteger('haftalik-maas');
            const gercekBonservis = bonservisMilyon * 1000000;

            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi));
            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Bu isimde bir futbolcu bulunamadı!', flags: 64 });

            if (hedefFutbolcu.takim === kulup.isim) {
                return interaction.reply({ content: '❌ Zaten kendi takımınızdaki bir oyuncuya teklif yapamazsınız!', flags: 64 });
            }

            if (kulup.butce < gercekBonservis) {
                return interaction.reply({ content: '❌ Kulüp kasasında yeterli bütçe yok!', flags: 64 });
            }

            if (hedefFutbolcu.takim === 'Serbest') {
                if (bonservisMilyon < (hedefFutbolcu.piyasaDegeri * 0.70)) {
                    return interaction.reply({ embeds: [new EmbedBuilder().setTitle('❌ Teklif Reddedildi').setDescription(`Oyuncu teklifinizi çok düşük buldu. Piyasa değeri: ${hedefFutbolcu.piyasaDegeri}M€`).setColor('#e74c3c')], flags: 64 });
                }
                kulup.butce -= gercekBonservis;
                hedefFutbolcu.takim = kulup.isim;
                hedefFutbolcu.maas = haftalikMaas;
                veriyiKaydet();

                await transferDuyurusuGonder(guild, kulup.isim, hedefFutbolcu.name, bonservisMilyon, haftalikMaas);
                return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 TRANSFER BAŞARILI!').setDescription(`**${hedefFutbolcu.name}** serbest oyuncu olarak kadroya katıldı!`).setColor('#2ecc71')] });
            } else {
                const eskiTakimAdi = hedefFutbolcu.takim;
                const sans = Math.random();

                if (sans < 0.40) {
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('❌ TRANSFER REDDEDİLDİ')
                            .setDescription(`**${eskiTakimAdi}** yönetimi, **${hedefFutbolcu.name}** için yapılan **${bonservisMilyon}M€** teklifini kesinlikle reddetti!`)
                            .setColor('#e74c3c')
                        ]
                    });
                } else if (sans < 0.70) {
                    const yeniBonservis = Math.round(bonservisMilyon * 1.3);
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🤝 KULÜPTEN KARŞI TEKLİF VAR')
                            .setDescription(`**${eskiTakimAdi}** yönetimi teklifinizi revize etti:\n\n⚽ Oyuncu: **${hedefFutbolcu.name}**\n💰 İstenen Bonservis: **${yeniBonservis}M€**\n\n*(Teklifi kabul etmek için /transfer-kabul, karşı teklif için /transfer-karsi-teklif kullanabilirsin)*`)
                            .setColor('#f39c12')
                        ]
                    });
                } else {
                    kulup.butce -= gercekBonservis;
                    const eskiTakimKey = Object.keys(db.takimlar).find(k => db.takimlar[k].isim === eskiTakimAdi);
                    if (eskiTakimKey) {
                        db.takimlar[eskiTakimKey].butce += gercekBonservis;
                    }
                    hedefFutbolcu.takim = kulup.isim;
                    hedefFutbolcu.maas = haftalikMaas;
                    veriyiKaydet();

                    await transferDuyurusuGonder(guild, kulup.isim, hedefFutbolcu.name, bonservisMilyon, haftalikMaas);
                    return interaction.reply({
                        embeds: [new EmbedBuilder()
                            .setTitle('🔥 KULÜPLERARASI TRANSFER BAŞARILI!')
                            .setDescription(`**${eskiTakimAdi}** ile anlaşmaya varıldı! **${hedefFutbolcu.name}** artık **${kulup.isim}** forması giyecek.`)
                            .setColor('#2ecc71')
                        ]
                    });
                }
            }
        }

        if (commandName === 'transfer-kabul') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi));
            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Bu isimde bir futbolcu bulunamadı!', flags: 64 });

            const maliyet = hedefFutbolcu.piyasaDegeri * 1000000;
            if (kulup.butce < maliyet) return interaction.reply({ content: '❌ Kulüp kasasında yeterli bütçe yok!', flags: 64 });

            kulup.butce -= maliyet;
            const eskiTakimAdi = hedefFutbolcu.takim;
            if (eskiTakimAdi !== 'Serbest') {
                const eskiTakimKey = Object.keys(db.takimlar).find(k => db.takimlar[k].isim === eskiTakimAdi);
                if (eskiTakimKey) db.takimlar[eskiTakimKey].butce += maliyet;
            }

            hedefFutbolcu.takim = kulup.isim;
            veriyiKaydet();

            await transferDuyurusuGonder(guild, kulup.isim, hedefFutbolcu.name, hedefFutbolcu.piyasaDegeri, hedefFutbolcu.maas);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🤝 TRANSFER BAŞARILI!')
                    .setDescription(`**${hedefFutbolcu.name}** başarıyla **${kulup.isim}** kadrosuna katıldı!`)
                    .setColor('#2ecc71')
                ]
            });
        }

        if (commandName === 'transfer-red') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('❌ TRANSFER İPTAL EDİLDİ')
                    .setDescription(`**${futbolcuAdi.toUpperCase()}** için yapılan görüşmeler sonlandırıldı.`)
                    .setColor('#e74c3c')
                ]
            });
        }

        if (commandName === 'transfer-karsi-teklif') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın!', flags: 64 });

            const futbolcuAdi = options.getString('futbolcu-adi').toLowerCase();
            const yeniBonservis = options.getInteger('bonservis');
            const gercekBonservis = yeniBonservis * 1000000;

            const hedefFutbolcu = Object.values(db.oyuncular).find(f => f.name.toLowerCase().includes(futbolcuAdi));
            if (!hedefFutbolcu) return interaction.reply({ content: '❌ Bu isimde bir futbolcu bulunamadı!', flags: 64 });

            if (kulup.butce < gercekBonservis) {
                return interaction.reply({ content: '❌ Kulüp kasasında belirttiğiniz bütçe yok!', flags: 64 });
            }

            kulup.butce -= gercekBonservis;
            const eskiTakimAdi = hedefFutbolcu.takim;
            if (eskiTakimAdi !== 'Serbest') {
                const eskiTakimKey = Object.keys(db.takimlar).find(k => db.takimlar[k].isim === eskiTakimAdi);
                if (eskiTakimKey) db.takimlar[eskiTakimKey].butce += gercekBonservis;
            }

            hedefFutbolcu.takim = kulup.isim;
            veriyiKaydet();

            await transferDuyurusuGonder(guild, kulup.isim, hedefFutbolcu.name, yeniBonservis, hedefFutbolcu.maas);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('🔥 KARŞI TEKLİF KABUL EDİLDİ!')
                    .setDescription(`Teklifiniz onaylandı! **${hedefFutbolcu.name}** artık **${kulup.isim}** forması giyecek.`)
                    .setColor('#2ecc71')
                ]
            });
        }

        if (commandName === 'kadrom') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımın T.D.si olmalısın.', flags: 64 });

            const futbolcularim = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (futbolcularim.length === 0) return interaction.reply({ content: '❌ Kadronuzda henüz futbolcu yok.', flags: 64 });

            let liste = "";
            let toplamMaas = 0;
            futbolcularim.forEach((f, i) => {
                toplamMaas += f.maas;
                liste += `**${i + 1}. ${f.name}** | ${f.mevki} | Değer: ${f.piyasaDegeri}M€ | Maaş: €${f.maas.toLocaleString()}\n`;
            });

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ KADRO | ${kulup.isim} (${futbolcularim.length}/16)`).setDescription(liste).addFields({ name: '💸 Toplam Haftalık Maaş', value: `€${toplamMaas.toLocaleString()}` }).setColor('#f1c40f')] });
        }

        if (commandName === 'takimlar') {
            const takimlar = Object.values(db.takimlar);
            let liste = "";
            takimlar.forEach((t, i) => {
                const tdBilgi = t.kurucu && t.kurucu !== "Sistem" ? `<@${t.kurucu}>` : "Boşta";
                liste += `**${i + 1}. ${t.isim}** | T.D: ${tdBilgi} | Kasa: €${t.butce.toLocaleString()}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ TAKIMLAR VE BÜTÇELER').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'takim-sec') {
            const girilenIsim = options.getString('takim-adi').trim().toLowerCase();
            const ztnBaskasi = kullanicininTakiminiBul(user.id);
            if (ztnBaskasi) return interaction.reply({ content: `❌ Zaten ${ztnBaskasi.isim} takımı yöneticisiniz!`, flags: 64 });

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenIsim || db.takimlar[k].isim.toLowerCase().includes(girilenIsim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Takım bulunamadı!', flags: 64 });

            const secilenTakim = db.takimlar[bulunanKey];
            if (secilenTakim.kurucu && secilenTakim.kurucu !== "Sistem") return interaction.reply({ content: '❌ Bu takımın T.D.si var!', flags: 64 });

            secilenTakim.kurucu = String(user.id);
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Artık **${secilenTakim.isim}** teknik direktörüsün. Başarılar!`).setColor('#2ecc71')] });
        }

        if (commandName === 'mac-yap') {
            const evSahibiTakim = kullanicininTakiminiBul(user.id);
            if (!evSahibiTakim) return interaction.reply({ content: '❌ T.D. olmalısın!', flags: 64 });

            const rakipIsim = options.getString('rakip-takim').trim().toLowerCase();
            const rakipKey = Object.keys(db.takimlar).find(k => k === rakipIsim || db.takimlar[k].isim.toLowerCase().includes(rakipIsim));
            if (!rakipKey) return interaction.reply({ content: '❌ Rakip takım bulunamadı!', flags: 64 });

            const deplasmanTakim = db.takimlar[rakipKey];
            if (evSahibiTakim.isim === deplasmanTakim.isim) return interaction.reply({ content: '❌ Kendi takımınla maç yapamazsın!', flags: 64 });

            await interaction.reply({ content: `⚔️ **${evSahibiTakim.isim}** vs **${deplasmanTakim.isim}** karşılaşması başlatılıyor!` });
            await tekilCanliMacOyna(channel, evSahibiTakim.isim, deplasmanTakim.isim, guild);
            return;
        }

        if (commandName === 'gol-kralligi') {
            const oyuncular = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            if (oyuncular.length === 0) return interaction.reply({ content: 'Henüz gol atan oyuncu yok.', flags: 64 });
            let liste = "";
            oyuncular.forEach((o, i) => { liste += `**${i + 1}. ${o.name}** (${o.takim}) - **${o.gol} Gol**\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(liste).setColor('#e67e22')] });
        }

        if (commandName === 'gol-sesi-kanal') {
            const kanal = options.getChannel('kanal');
            golKanalId = kanal.id;
            return interaction.reply({ content: `✅ Gol ses kanalı <#${kanal.id}> olarak ayarlandı.`, flags: 64 });
        }

        if (commandName === 'sponsor') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. olmalısın.', flags: 64 });
            const simdi = Date.now();
            if (simdi - (kulup.sonSponsor || 0) < 10800000) return interaction.reply({ content: '⏳ Sponsor için süre dolmadı.', flags: 64 });

            const gelir = Math.floor(Math.random() * 5000000) + 3000000;
            kulup.butce += gelir;
            kulup.sonSponsor = simdi;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR GELİRİ!').setDescription(`Kasaya €${gelir.toLocaleString()} eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const kulup = kullanicininTakiminiBul(user.id);
            if (!kulup) return interaction.reply({ content: '❌ T.D. değilsin.', flags: 64 });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe: ${kulup.isim}`).setDescription(`Kasa: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'butce-ver') {
            const girilenTakim = options.getString('takim-adi').trim().toLowerCase();
            const miktarMilyon = options.getInteger('miktar');
            const eklenenPara = miktarMilyon * 1000000;

            const bulunanKey = Object.keys(db.takimlar).find(k => k === girilenTakim || db.takimlar[k].isim.toLowerCase().includes(girilenTakim));
            if (!bulunanKey) return interaction.reply({ content: '❌ Takım bulunamadı!', flags: 64 });

            db.takimlar[bulunanKey].butce += eklenenPara;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💰 BÜTÇE EKLENDİ').setDescription(`Takıma €${eklenenPara.toLocaleString()} eklendi!`).setColor('#2ecc71')], flags: 64 });
        }

        if (commandName === 'puan-durumu') {
            const takimlar = Object.values(db.takimlar).sort((a, b) => b.puan - a.puan || b.av - a.av);
            let liste = "";
            takimlar.forEach((t, i) => { liste += `**${i + 1}. ${t.isim}** | O: ${t.o} | Puan: ${t.puan}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            let takimListesi = Object.values(db.takimlar);
            if (takimListesi.length < 2) return interaction.reply({ content: '❌ En az 2 takım olmalı!', flags: 64 });

            db.sezonAktif = true;
            veriyiKaydet();
            await interaction.reply({ content: `🚀 **SEZON BAŞLADI!** Maçlar oynanıyor.` });

            for (let i = 0; i < takimListesi.length; i++) {
                for (let j = i + 1; j < takimListesi.length; j++) {
                    if (!db.sezonAktif) break;
                    const ev = takimListesi[i].isim;
                    const dep = takimListesi[j].isim;

                    await channel.send(`📢 **MAÇ:** **${ev} vs ${dep}**`);
                    const sonuc = await tekilCanliMacOyna(channel, ev, dep, guild);
                    if (!sonuc) break;
                    await new Promise(r => setTimeout(r, 4000));
                }
                if (!db.sezonAktif) break;
            }

            if (db.sezonAktif) {
                db.sezonAktif = false;
                veriyiKaydet();
                await channel.send(`🎉 **SEZON TAMAMLANDI!**`);
            }
        }

        if (commandName === 'sezon-durdur') {
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.reply({ content: '🛑 Sezon ve devam eden maçlar durduruldu!', flags: 64 });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => {
                t.puan = 0; t.av = 0; t.o = 0; t.g = 0; t.b = 0; t.m = 0;
            });
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.reply({ content: '🔄 Lig sıfırlandı.', flags: 64 });
        }

    } catch (err) {
        console.error('Komut hatası:', err);
    }
});

client.login(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);
