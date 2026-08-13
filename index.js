const { 
    Client, 
    GatewayIntentBits, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    EmbedBuilder, 
    PermissionFlagsBits,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const http = require('http');
const fs = require('fs');
require('dotenv').config();

// Web Sunucusu (7/24 Uptime İçin)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
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
    gecici11ler: {},
    macTahminleri: {},
    kullanilanTahminler: {},
    aktifMaclar: {},
    sezonAktif: false,
    transferKanalId: null,
    transferKanalAyarlaId: null,
    hosgeldinKanalId: null,
    sponsorKanalId: null,
    botCalistirmaKanalId: null,
    antrenmanKanalId: null,
    otomatikSezonVerisi: null
};

if (fs.existsSync(DB_FILE)) {
    try {
        const dosyaVerisi = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        db = { ...db, ...dosyaVerisi };
    } catch (e) {
        console.error("Veritabanı okuma hatası:", e);
    }
}

let isSaving = false;
function veriyiKaydet() {
    if (isSaving) return;
    isSaving = true;
    setTimeout(() => {
        try {
            fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
        } catch (e) {
            console.error("Veri kaydetme hatası:", e);
        } finally {
            isSaving = false;
        }
    }, 500);
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
    { isim: "Jude Bellingham", mevki: "OS", deger: 180 },
    { isim: "Erling Haaland", mevki: "SNT", deger: 180 },
    { isim: "Vinicius Junior", mevki: "KANAT", deger: 180 },
    { isim: "Lamine Yamal", mevki: "KANAT", deger: 160 },
    { isim: "Bukayo Saka", mevki: "KANAT", deger: 140 },
    { isim: "Phil Foden", mevki: "OS", deger: 130 },
    { isim: "Florian Wirtz", mevki: "OS", deger: 130 },
    { isim: "Jamal Musiala", mevki: "OS", deger: 130 },
    { isim: "Cole Palmer", mevki: "OS", deger: 120 },
    { isim: "Declan Rice", mevki: "OS", deger: 120 },
    { isim: "Rodri", mevki: "OS", deger: 110 },
    { isim: "Martin Ødegaard", mevki: "OS", deger: 110 },
    { isim: "Federico Valverde", mevki: "OS", deger: 100 },
    { isim: "Harry Kane", mevki: "SNT", deger: 100 },
    { isim: "Lautaro Martinez", mevki: "SNT", deger: 100 },
    { isim: "Rodrygo Goes", mevki: "KANAT", deger: 100 },
    { isim: "Victor Osimhen", mevki: "SNT", deger: 100 },
    { isim: "Julian Alvarez", mevki: "SNT", deger: 90 },
    { isim: "Gavi", mevki: "OS", deger: 90 },
    { isim: "William Saliba", mevki: "STP", deger: 80 },
    { isim: "Ruben Dias", mevki: "STP", deger: 80 },
    { isim: "Pedri", mevki: "OS", deger: 80 },
    { isim: "Josko Gvardiol", mevki: "DF", deger: 75 },
    { isim: "Alexis Mac Allister", mevki: "OS", deger: 75 },
    { isim: "Enzo Fernandez", mevki: "OS", deger: 75 },
    { isim: "Moises Caicedo", mevki: "OS", deger: 75 },
    { isim: "Kevin De Bruyne", mevki: "OS", deger: 70 },
    { isim: "Trent Alexander-Arnold", mevki: "DF", deger: 70 },
    { isim: "Alessandro Bastoni", mevki: "STP", deger: 70 },
    { isim: "Ronald Araujo", mevki: "STP", deger: 70 },
    { isim: "Mohamed Salah", mevki: "KANAT", deger: 65 },
    { isim: "Achraf Hakimi", mevki: "DF", deger: 60 },
    { isim: "Theo Hernandez", mevki: "DF", deger: 60 },
    { isim: "Bremer", mevki: "STP", deger: 60 },
    { isim: "Endrick", mevki: "SNT", deger: 60 },
    { isim: "Frenkie de Jong", mevki: "OS", deger: 60 },
    { isim: "Joao Neves", mevki: "OS", deger: 60 },
    { isim: "Douglas Luiz", mevki: "OS", deger: 55 },
    { isim: "Michael Olise", mevki: "KANAT", deger: 55 },
    { isim: "Alphonso Davies", mevki: "DF", deger: 50 },
    { isim: "Savinho", mevki: "KANAT", deger: 50 },
    { isim: "Amadou Onana", mevki: "OS", deger: 50 },
    { isim: "Joshua Zirkzee", mevki: "SNT", deger: 50 },
    { isim: "Leny Yoro", mevki: "STP", deger: 50 },
    { isim: "Teun Koopmeiners", mevki: "OS", deger: 50 },
    { isim: "Raphinha", mevki: "KANAT", deger: 50 },
    { isim: "Victor Boniface", mevki: "SNT", deger: 45 },
    { isim: "Riccardo Calafiori", mevki: "STP", deger: 45 },
    { isim: "Pau Cubarsi", mevki: "STP", deger: 40 },
    { isim: "Antonio Rüdiger", mevki: "STP", deger: 25 },
    { isim: "Virgil van Dijk", mevki: "STP", deger: 30 },
    { isim: "Thibaut Courtois", mevki: "KL", deger: 45 },
    { isim: "Alisson Becker", mevki: "KL", deger: 35 },
    { isim: "Marc-Andre ter Stegen", mevki: "KL", deger: 25 },
    { isim: "Ederson", mevki: "KL", deger: 35 },
    { isim: "Mike Maignan", mevki: "KL", deger: 35 },
    { isim: "Gianluigi Donnarumma", mevki: "KL", deger: 40 },
    { isim: "Rafael Leao", mevki: "KANAT", deger: 90 },
    { isim: "Khvicha Kvaratskhelia", mevki: "KANAT", deger: 85 },
    { isim: "Son Heung-min", mevki: "KANAT", deger: 50 },
    { isim: "Ousmane Dembele", mevki: "KANAT", deger: 60 },
    { isim: "Leroy Sane", mevki: "KANAT", deger: 70 },
    { isim: "Serge Gnabry", mevki: "KANAT", deger: 40 },
    { isim: "Kingsley Coman", mevki: "KANAT", deger: 50 },
    { isim: "Federico Chiesa", mevki: "KANAT", deger: 35 },
    { isim: "Gabriel Martinelli", mevki: "KANAT", deger: 70 },
    { isim: "Anthony Gordon", mevki: "KANAT", deger: 60 },
    { isim: "Nico Williams", mevki: "KANAT", deger: 70 },
    { isim: "Dani Olmo", mevki: "OS", deger: 60 },
    { isim: "Dominik Szoboszlai", mevki: "OS", deger: 75 },
    { isim: "Bruno Fernandes", mevki: "OS", deger: 65 },
    { isim: "Bernardo Silva", mevki: "OS", deger: 70 },
    { isim: "Eduardo Camavinga", mevki: "OS", deger: 100 },
    { isim: "Aurelien Tchouameni", mevki: "OS", deger: 100 },
    { isim: "Nicolo Barella", mevki: "OS", deger: 80 },
    { isim: "Hakan Çalhanoğlu", mevki: "OS", deger: 45 },
    { isim: "Joshua Kimmich", mevki: "OS", deger: 50 },
    { isim: "Leon Goretzka", mevki: "OS", deger: 30 },
    { isim: "Granit Xhaka", mevki: "OS", deger: 20 },
    { isim: "Alejandro Garnacho", mevki: "KANAT", deger: 50 },
    { isim: "Alexander Isak", mevki: "SNT", deger: 75 },
    { isim: "Dusan Vlahovic", mevki: "SNT", deger: 65 },
    { isim: "Ollie Watkins", mevki: "SNT", deger: 65 },
    { isim: "Darwin Nunez", mevki: "SNT", deger: 70 },
    { isim: "Marcus Rashford", mevki: "KANAT", deger: 60 },
    { isim: "Jeremie Frimpong", mevki: "DF", deger: 50 },
    { isim: "Reece James", mevki: "DF", deger: 35 },
    { isim: "Gregor Kobel", mevki: "KL", deger: 40 },
    { isim: "Diogo Costa", mevki: "KL", deger: 45 },
    { isim: "Jan Oblak", mevki: "KL", deger: 25 },
    { isim: "Uğurcan Çakır", mevki: "KL", deger: 9 },
    { isim: "Altay Bayındır", mevki: "KL", deger: 6 },
    { isim: "Ersin Destanoğlu", mevki: "KL", deger: 4 },
    { isim: "Günay Güvenç", mevki: "KL", deger: 2 },
    { isim: "Berke Özer", mevki: "KL", deger: 3 },
    { isim: "Doğan Alemdar", mevki: "KL", deger: 3 },
    { isim: "İrfan Can Eğribayat", mevki: "KL", deger: 2 },
    { isim: "Muhammet Şengezer", mevki: "KL", deger: 2 },
    { isim: "Okan Kocuk", mevki: "KL", deger: 2 },
    { isim: "Ertaç Özbir", mevki: "KL", deger: 1 },
    { isim: "Abdülkerim Bardakcı", mevki: "STP", deger: 8 },
    { isim: "Çağlar Söyüncü", mevki: "STP", deger: 9 },
    { isim: "Merih Demiral", mevki: "STP", deger: 7 },
    { isim: "Samet Akaydin", mevki: "STP", deger: 3 },
    { isim: "Kaan Ayhan", mevki: "DF", deger: 5 },
    { isim: "Zeki Çelik", mevki: "DF", deger: 6 },
    { isim: "Rıdvan Yılmaz", mevki: "DF", deger: 4 },
    { isim: "Mert Müldür", mevki: "DF", deger: 4 },
    { isim: "Ahmetcan Kaplan", mevki: "STP", deger: 5 },
    { isim: "Eren Elmalı", mevki: "DF", deger: 3 },
    { isim: "Serdar Saatçı", mevki: "STP", deger: 3 },
    { isim: "Ozan Kabak", mevki: "STP", deger: 7 },
    { isim: "Taylan Antalyalı", mevki: "OS", deger: 2 },
    { isim: "Berkan Kutlu", mevki: "OS", deger: 3 },
    { isim: "Salih Uçan", mevki: "OS", deger: 4 },
    { isim: "Emre Kılınç", mevki: "KANAT", deger: 3 },
    { isim: "Yusuf Yazıcı", mevki: "OS", deger: 7 },
    { isim: "İrfan Can Kahveci", mevki: "OS", deger: 8 },
    { isim: "Cengiz Ünder", mevki: "KANAT", deger: 10 },
    { isim: "Kerem Aktürkoğlu", mevki: "KANAT", deger: 12 },
    { isim: "Barış Alper Yılmaz", mevki: "KANAT", deger: 15 },
    { isim: "Yunus Akgün", mevki: "KANAT", deger: 6 },
    { isim: "Emirhan İlkhan", mevki: "OS", deger: 4 },
    { isim: "Berat Özdemir", mevki: "OS", deger: 3 },
    { isim: "İsmail Yüksek", mevki: "OS", deger: 9 },
    { isim: "Bartuğ Elmaz", mevki: "OS", deger: 2 },
    { isim: "Oğuz Aydın", mevki: "KANAT", deger: 6 },
    { isim: "Can Uzun", mevki: "OS", deger: 8 },
    { isim: "Cenk Tosun", mevki: "SNT", deger: 3 },
    { isim: "Umut Nayir", mevki: "SNT", deger: 2 },
    { isim: "Enis Destan", mevki: "SNT", deger: 3 },
    { isim: "Mustafa Hekimoğlu", mevki: "SNT", deger: 2 },
    { isim: "Deniz Gül", mevki: "SNT", deger: 3 },
    { isim: "Ege Bilsel", mevki: "OS", deger: 1 },
    { isim: "Gökhan Sazdağı", mevki: "DF", deger: 2 },
    { isim: "Ali Şansal", mevki: "KL", deger: 1 },
    { isim: "Emre Demir", mevki: "OS", deger: 2 },
    { isim: "Yasin Özcan", mevki: "STP", deger: 4 },
    { isim: "Mehmet Aydın", mevki: "DF", deger: 3 },
    { isim: "Lionel Messi", mevki: "KANAT", deger: 30 },
    { isim: "Cristiano Ronaldo", mevki: "SNT", deger: 15 },
    { isim: "Neymar Jr", mevki: "KANAT", deger: 45 },
    { isim: "Karim Benzema", mevki: "SNT", deger: 25 },
    { isim: "Robert Lewandowski", mevki: "SNT", deger: 15 },
    { isim: "Antoine Griezmann", mevki: "SNT", deger: 40 },
    { isim: "Paulo Dybala", mevki: "OS", deger: 25 },
    { isim: "Lukaku", mevki: "SNT", deger: 30 },
    { isim: "Ciro Immobile", mevki: "SNT", deger: 15 },
    { isim: "Sadio Mane", mevki: "KANAT", deger: 20 },
    { isim: "Riyad Mahrez", mevki: "KANAT", deger: 15 },
    { isim: "N'Golo Kante", mevki: "OS", deger: 10 },
    { isim: "Casemiro", mevki: "OS", deger: 15 },
    { isim: "Toni Kroos (Efsane)", mevki: "OS", deger: 50 },
    { isim: "Luka Modric", mevki: "OS", deger: 8 },
    { isim: "Manuel Neuer", mevki: "KL", deger: 5 },
    { isim: "Hugo Lloris", mevki: "KL", deger: 3 },
    { isim: "Keylor Navas", mevki: "KL", deger: 2 },
    { isim: "Wojciech Szczesny", mevki: "KL", deger: 10 },
    { isim: "Matthijs de Ligt", mevki: "STP", deger: 55 },
    { isim: "Lisandro Martinez", mevki: "STP", deger: 45 },
    { isim: "Ben White", mevki: "DF", deger: 55 },
    { isim: "Kyle Walker", mevki: "DF", deger: 13 },
    { isim: "John Stones", mevki: "STP", deger: 38 },
    { isim: "Manuel Akanji", mevki: "STP", deger: 40 },
    { isim: "Nathan Ake", mevki: "DF", deger: 40 },
    { isim: "Lucas Paqueta", mevki: "OS", deger: 65 },
    { isim: "Bruno Guimaraes", mevki: "OS", deger: 85 },
    { isim: "Sandro Tonali", mevki: "OS", deger: 40 },
    { isim: "James Maddison", mevki: "OS", deger: 70 },
    { isim: "Dejan Kulusevski", mevki: "KANAT", deger: 55 },
    { isim: "Richarlison", mevki: "SNT", deger: 35 },
    { isim: "Gabriel Jesus", mevki: "SNT", deger: 65 },
    { isim: "Kai Havertz", mevki: "SNT", deger: 75 },
    { isim: "Raheem Sterling", mevki: "KANAT", deger: 25 },
    { isim: "Christopher Nkunku", mevki: "OS", deger: 60 },
    { isim: "Nicolas Jackson", mevki: "SNT", deger: 40 },
    { isim: "Marcus Thuram", mevki: "SNT", deger: 65 },
    { isim: "Benjamin Pavard", mevki: "STP", deger: 40 },
    { isim: "Federico Dimarco", mevki: "DF", deger: 50 },
    { isim: "Denzel Dumfries", mevki: "DF", deger: 25 },
    { isim: "Adrien Rabiot", mevki: "OS", deger: 35 },
    { isim: "Marcus Edwards", mevki: "KANAT", deger: 20 },
    { isim: "Orkun Kökçü", mevki: "OS", deger: 28 },
    { isim: "Ferdi Kadıoğlu", mevki: "DF", deger: 30 },
    { isim: "Arda Güler", mevki: "OS", deger: 45 },
    { isim: "Kenan Yıldız", mevki: "KANAT", deger: 40 },
    { isim: "Semih Kılıçsoy", mevki: "SNT", deger: 15 }
];

function otomatikTakimlariVeFutbolculariYukle() {
    if (!db.takimlar) db.takimlar = {};
    
    UNLU_TAKIMLAR.forEach(takimIsmi => {
        const key = takimIsmi.toLowerCase();
        if (!db.takimlar[key]) {
            db.takimlar[key] = {
                isim: takimIsmi,
                kurucu: null,
                puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0,
                butce: 150000000,
                sonSponsor: 0,
                sonAntrenman: 0,
                krediBorc: 0
            };
        } else {
            if (db.takimlar[key].sonAntrenman === undefined) db.takimlar[key].sonAntrenman = 0;
            if (db.takimlar[key].krediBorc === undefined) db.takimlar[key].krediBorc = 0;
            if (db.takimlar[key].sonSponsor === undefined) db.takimlar[key].sonSponsor = 0;
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
                asist: 0,
                sakatlik: 0,
                cezali: 0,
                takim: 'Serbest'
            };
        });
    }
    veriyiKaydet();
}

function kullanicininTakiminiBulVeyaAta(userId) {
    if (!userId || !db.takimlar) return null;
    const temizId = String(userId).trim();
    return Object.values(db.takimlar).find(t => t.kurucu && String(t.kurucu).trim() === temizId) || null;
}

const commands = [
    new SlashCommandBuilder()
        .setName('bot-kanal')
        .setDescription('Botun komut kullanım kanallarını yönetir.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('ayarla')
               .setDescription('Botun çalışacağı ana komut kanalını ayarlar.')
               .addChannelOption(opt => opt.setName('kanal').setDescription('Bot Kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('kaldır')
               .setDescription('Kanal kısıtlamasını kaldırır, bot her kanalda kullanılabilir.')
        ),

    new SlashCommandBuilder()
        .setName('transfer-kanal-ayarla')
        .setDescription('Transfer işlemlerinin yapılabileceği özel kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Transfer Kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('antrenman-kanal-ayarla')
        .setDescription('Antrenman komutunun kullanılabileceği özel kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Antrenman Kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('twitter')
        .setDescription('Sunucuda Twitter (X) formatında mesaj gönderir.')
        .addStringOption(opt => opt.setName('mesaj').setDescription('Tweet içeriği').setRequired(true)),

    new SlashCommandBuilder()
        .setName('rehber')
        .setDescription('Sunucuda nasıl takım alacağını ve kadro kuracağını anlatan rehber menüsü.'),

    new SlashCommandBuilder()
        .setName('takvim')
        .setDescription('Sunucudaki aktif maçları ve lig takvimini görüntüler.')
        .addSubcommand(sub => sub.setName('goster').setDescription('Lig takvimini ve butonları gösterir.'))
        .addSubcommand(sub => sub.setName('sezon-baslat').setDescription('Takvim üzerinden lig sezonunu başlatır.')),

    new SlashCommandBuilder()
        .setName('hosgeldin-kanal-ayarla')
        .setDescription('Yeni gelen üyelerin karşılanacağı kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Kanal').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder()
        .setName('sponsor-kanal-ayarla')
        .setDescription('/sponsor komutunun kullanılabileceği özel kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Sponsor Kanalı').addChannelTypes(ChannelType.GuildText).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
        .setName('oto-ilk11')
        .setDescription('Belirttiğin bütçenin %97-99 unu kullanarak en iyi 11 oyuncuyu seçer.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3, 4-4-2').setRequired(true))
        .addIntegerOption(opt => opt.setName('butce').setDescription('Harcanacak toplam bütçe (Milyon €)').setRequired(true)),

    new SlashCommandBuilder().setName('11-onayla').setDescription('Önizlemesi yapılan otomatik ilk 11 kadrosunu onaylayıp takımınıza katar.'),
    new SlashCommandBuilder().setName('11-reddet').setDescription('Önizlemesi yapılan otomatik ilk 11 teklifini reddeder.'),

    new SlashCommandBuilder()
        .setName('tahmin')
        .setDescription('Maç başladıktan sonra skor tahmini yaparsınız (Maç başına sadece 1 kez).')
        .addStringOption(opt => opt.setName('mac').setDescription('Tahmin yapılacak maç').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('skor').setDescription('Örn: 3-1').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-teklif')
        .setDescription('Futbolcuya teklif yaparsınız.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('bonservis').setDescription('Bonservis (Milyon €)').setRequired(true))
        .addIntegerOption(opt => opt.setName('haftalik-maas').setDescription('Haftalık maaş (€)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-kabul')
        .setDescription('Gelen transfer teklifini onaylar.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('transfer-red')
        .setDescription('Transfer teklifini reddeder.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Futbolcunun adı').setRequired(true)),

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
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Seçmek istediğiniz boş takımı arayın').setRequired(true).setAutocomplete(true)),
    
    new SlashCommandBuilder()
        .setName('mac-yap')
        .setDescription('Canlı maç yaparsınız.')
        .addStringOption(opt => opt.setName('rakip-takim').setDescription('Rakip takım adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('3-takimli-sezon')
        .setDescription('3 takımlı, 10 maçlık otomatik özel sezon başlatır.')
        .addStringOption(opt => opt.setName('takim1').setDescription('1. Takım Adı').setRequired(true))
        .addUserOption(opt => opt.setName('td1').setDescription('1. Takımın T.D.').setRequired(true))
        .addStringOption(opt => opt.setName('takim2').setDescription('2. Takım Adı').setRequired(true))
        .addUserOption(opt => opt.setName('td2').setDescription('2. Takımın T.D.').setRequired(true))
        .addStringOption(opt => opt.setName('takim3').setDescription('3. Takım Adı').setRequired(true))
        .addUserOption(opt => opt.setName('td3').setDescription('3. Takımın T.D.').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mac-durdur')
        .setDescription('Devam eden otomatik sezonu veya maçları durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('puan-durumu').setDescription('Puan durumunu gösterir.'),
    new SlashCommandBuilder().setName('gol-kralligi').setDescription('Gol krallığını listeler.'),
    new SlashCommandBuilder().setName('asist-kralligi').setDescription('Asist krallığını listeler.'),
    new SlashCommandBuilder().setName('kadrom').setDescription('Takımınızdaki futbolcuları gösterir.'),
    new SlashCommandBuilder().setName('sponsor').setDescription('Sponsorluk geliri alırsınız.'),
    new SlashCommandBuilder().setName('butce').setDescription('Bütçenizi görüntüler.'),
    
    new SlashCommandBuilder()
        .setName('antrenman')
        .setDescription('Kadronuzdan bir oyuncuyu antrenmana sokarak değer ve gol/asist oranını artırır.')
        .addStringOption(opt => opt.setName('futbolcu-adi').setDescription('Antrenman yapacak futbolcunun adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kredi-cek')
        .setDescription('Kulübünüz için %10 faizle kredi çekersiniz.')
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Çekilecek miktar (Milyon €)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('kredi-ode')
        .setDescription('Kredi borcunuzu ödersiniz.')
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Ödenecek miktar (Milyon €)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('butce-ver')
        .setDescription('Takıma bütçe ekler (Yönetici).')
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı').setRequired(true))
        .addIntegerOption(opt => opt.setName('miktar').setDescription('Miktar (Milyon €)').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    new SlashCommandBuilder().setName('gol-sesi-kanal').setDescription('Gol ses kanalı ayarlar.')
        .addChannelOption(opt => opt.setName('kanal').setDescription('Ses Kanalı').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    
    new SlashCommandBuilder().setName('sezon-baslat').setDescription('Lig sezonunu başlatır (En az 5 takım gerekir).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('sezon-durdur').setDescription('Lig sezonunu durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    new SlashCommandBuilder().setName('lig-sifirla').setDescription('Ligi sıfırlar.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
].map(cmd => cmd.toJSON());

const token = process.env.DISCORD_TOKEN;
const rest = new REST({ version: '10' }).setToken(token);

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

client.on('guildMemberAdd', async member => {
    if (!db.hosgeldinKanalId) return;
    try {
        const kanal = await member.guild.channels.fetch(db.hosgeldinKanalId).catch(() => null);
        if (!kanal || kanal.type !== ChannelType.GuildText) return;

        const embed = new EmbedBuilder()
            .setTitle('⚽ Sunucumuza Hoş Geldin!')
            .setDescription(`Selam <@${member.id}>! Futbol ve lig simülasyonumuza hoş geldin.\n\n` +
                `🏆 **Nasıl Başlayacaksın?**\n` +
                `1️⃣ **\`/takim-sec\`** komutu ile kendine bir takım seçip Teknik Direktör ol.\n` +
                `2️⃣ **\`/oto-ilk11\`** komutu ile takımına harika bir kadro kur.\n` +
                `3️⃣ **\`/rehber\`** yazarak detaylı komut listesini ve ipuçlarını incele!\n\n` +
                `İyi eğlenceler dileriz!`)
            .setColor('#2ecc71')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await kanal.send({ content: `<@${member.id}> aramıza katıldı!`, embeds: [embed] }).catch(() => {});
    } catch (e) {
        console.error("Hoş geldin mesajı hatası:", e);
    }
});

const olaylar = [
    { metin: "{dakika}' - ⚽ **GOOOOL!** {hücum} takımından **{oyuncu}** harika bir vuruşla fileleri havalandırdı! Asist: **{asist}**. Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} yıldızı **{oyuncu}** tribünleri coşturan muhteşem bir gol attı! Harika pası veren: **{asist}**. Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} atağında **{oyuncu}** şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** {hücum} oyuncusu **{oyuncu}** sert vurdu, top az farkla auta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** {hücum} köşe vuruşu kazandı, tehlikeli orta geliyor.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** {hücum} atağında **{oyuncu}** vurdu, direkten döndü!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} takımından sert müdahale.", tip: "sari_kart" },
    { metin: "{dakika}' - 🟥 **KIRMIZI KART!** {defans} takımında **{oyuncu}** acımasızca kaydı ve hakem doğrudan kırmızı kart gösterdi!", tip: "kirmizi_kart" },
    { metin: "{dakika}' - 🚑 **SAKATLIK!** {hücum} oyuncusu **{oyuncu}** acı içinde yerde kaldı ve kenara oyundan alındı.", tip: "sakatlik" }
];

function futbolcuSecPozisyonaGore(takimAdi, tip, haricId = null) {
    if (!db.oyuncular) db.oyuncular = {};
    const takimOyunculari = Object.values(db.oyuncular).filter(o => o.takim === takimAdi && (!o.sakatlik || o.sakatlik <= 0) && (!o.cezali || o.cezali <= 0) && o.id !== haricId);
    
    const havuz = takimOyunculari.length > 0 ? takimOyunculari : Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
    if (havuz.length === 0) return { name: "Bilinmeyen Oyuncu", id: null, mevki: "OS" };

    if (tip === "gol") {
        const sntVeyaKanat = havuz.filter(o => o.mevki === 'SNT' || o.mevki === 'KANAT');
        const ortaSaha = havuz.filter(o => o.mevki === 'OS');
        const defansVeKL = havuz.filter(o => o.mevki === 'STP' || o.mevki === 'DF' || o.mevki === 'KL');

        const sans = Math.random();
        if (sans < 0.75 && sntVeyaKanat.length > 0) return sntVeyaKanat[Math.floor(Math.random() * sntVeyaKanat.length)];
        if (sans < 0.93 && ortaSaha.length > 0) return ortaSaha[Math.floor(Math.random() * ortaSaha.length)];
        if (defansVeKL.length > 0) return defansVeKL[Math.floor(Math.random() * defansVeKL.length)];
    } else if (tip === "asist") {
        const osVeyaKanat = havuz.filter(o => o.mevki === 'OS' || o.mevki === 'KANAT');
        const digerleri = havuz.filter(o => o.mevki !== 'OS' && o.mevki !== 'KANAT');

        const sans = Math.random();
        if (sans < 0.80 && osVeyaKanat.length > 0) return osVeyaKanat[Math.floor(Math.random() * osVeyaKanat.length)];
        if (digerleri.length > 0) return digerleri[Math.floor(Math.random() * digerleri.length)];
    }

    return havuz[Math.floor(Math.random() * havuz.length)];
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

function tahminleriKontrolEtVeOdulVer(evSahibi, deplasman, evSkor, depSkor, channel) {
    if (!db.macTahminleri) return;
    const macKey = `${evSahibi} vs ${deplasman}`.toLowerCase();
    const gercekSkorStr = `${evSkor}-${depSkor}`;

    if (db.aktifMaclar && db.aktifMaclar[macKey]) {
        delete db.aktifMaclar[macKey];
    }

    Object.keys(db.macTahminleri).forEach(userId => {
        const tahminVerisi = db.macTahminleri[userId];
        if (tahminVerisi && tahminVerisi.mac.toLowerCase() === macKey && tahminVerisi.skor === gercekSkorStr) {
            let kazananKulup = kullanicininTakiminiBulVeyaAta(userId);
            if (kazananKulup) {
                kazananKulup.butce += 50000000;
                veriyiKaydet();
                channel.send(`🎉 <@${userId}>, **${evSahibi} vs ${deplasman}** maç skorunu (**${gercekSkorStr}**) doğru tahmin etti ve kulübüne **+50M€** ödül kazandı! 🏆`).catch(() => {});
            }
        }
    });
    veriyiKaydet();
}

function tekilCanliMacOyna(channel, evSahibi, deplasman, guild) {
    return new Promise(async (resolve) => {
        let evSkor = 0;
        let depSkor = 0;
        let mevcutDakika = 1;
        let ilkYariBitti = false;
        const macAdi = `${evSahibi} vs ${deplasman}`;

        if (!db.aktifMaclar) db.aktifMaclar = {};
        db.aktifMaclar[macAdi.toLowerCase()] = macAdi;
        veriyiKaydet();

        const baslangicEmbed = new EmbedBuilder()
            .setTitle(`🎙️ MAÇ BAŞLADI | ${macAdi}`)
            .setDescription(`Karşılaşma hakemin düdüğüyle başladı! Şimdi \`/tahmin\` komutunu kullanarak bu maç için **tek bir kez** skor tahmininde bulunabilirsiniz!`)
            .setColor('#e74c3c');

        await channel.send({ embeds: [baslangicEmbed] }).catch(() => {});

        const macInterval = setInterval(async () => {
            if (db.otomatikSezonVerisi && db.otomatikSezonVerisi.durduruldu) {
                clearInterval(macInterval);
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
                    .setTitle(`🏁 MAÇ BİTTİ! | ${macAdi}`)
                    .setDescription(`**MAÇ SONUCU:** **${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`)
                    .setColor('#2ecc71');

                await channel.send({ embeds: [bitisEmbed] }).catch(() => {});
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor, channel);
                tahminleriKontrolEtVeOdulVer(evSahibi, deplasman, evSkor, depSkor, channel);
                resolve(true);
                return;
            }

            let secilenOlay;
            const sans = Math.random();

            if (sans < 0.15) { 
                const goller = olaylar.filter(o => o.tip === "gol");
                secilenOlay = goller[Math.floor(Math.random() * goller.length)];
            } else if (sans < 0.17) { 
                secilenOlay = olaylar.find(o => o.tip === "sakatlik");
            } else if (sans < 0.18) { 
                secilenOlay = olaylar.find(o => o.tip === "kirmizi_kart");
            } else { 
                const normaller = olaylar.filter(o => o.tip === "normal" || o.tip === "sari_kart");
                secilenOlay = normaller[Math.floor(Math.random() * normaller.length)];
            }

            const hucumTakim = Math.random() < 0.5 ? evSahibi : deplasman;
            const defansTakim = hucumTakim === evSahibi ? deplasman : evSahibi;
            
            let golAtan = futbolcuSecPozisyonaGore(hucumTakim, (secilenOlay.tip === "kirmizi_kart" || secilenOlay.tip === "sari_kart") ? "normal" : "gol");
            let asistYapan = futbolcuSecPozisyonaGore(hucumTakim, "asist", golAtan.id);
            if (asistYapan.name === golAtan.name) {
                asistYapan = { name: "Orta Saha Oyuncusu", mevki: "OS" };
            }

            if (secilenOlay.tip === "gol") {
                if (hucumTakim === evSahibi) evSkor++;
                else depSkor++;

                if (golAtan && golAtan.id && db.oyuncular[golAtan.id]) {
                    db.oyuncular[golAtan.id].gol = (db.oyuncular[golAtan.id].gol || 0) + 1;
                }
                if (asistYapan && asistYapan.id && db.oyuncular[asistYapan.id]) {
                    db.oyuncular[asistYapan.id].asist = (db.oyuncular[asistYapan.id].asist || 0) + 1;
                }
                veriyiKaydet();
                if (guild) golSesiCal(guild);
            } else if (secilenOlay.tip === "kirmizi_kart" && golAtan && golAtan.id) {
                if (db.oyuncular[golAtan.id]) {
                    db.oyuncular[golAtan.id].cezali = 1;
                }
            } else if (secilenOlay.tip === "sakatlik" && golAtan && golAtan.id) {
                if (db.oyuncular[golAtan.id]) {
                    db.oyuncular[golAtan.id].sakatlik = 2;
                }
            }

            const guncelSkor = `**${evSahibi} ${evSkor} - ${depSkor} ${deplasman}**`;
            const anlatim = (secilenOlay.metin || "")
                .replace('{dakika}', mevcutDakika > 90 ? 90 : mevcutDakika)
                .replace('{hücum}', hucumTakim)
                .replace('{defans}', defansTakim)
                .replace('{oyuncu}', golAtan.name)
                .replace('{asist}', asistYapan.name)
                .replace('{skor}', guncelSkor);

            await channel.send(anlatim).catch(() => {});

        }, 4000);
    });
}

function krediBorcunuDusVeyaHacizUygula(t, channel) {
    if (t.krediBorc && t.krediBorc > 0) {
        if (t.butce >= t.krediBorc) {
            t.butce -= t.krediBorc;
            t.krediBorc = 0;
            if (channel) channel.send(`🏦 **KREDİ ÖDENDİ:** ${t.isim} kulübü maç gelirinden kredi borcunun tamamını kapattı!`).catch(()=>{});
        } else {
            t.krediBorc -= t.butce;
            t.butce = 0;
            let takimOyunculari = Object.values(db.oyuncular).filter(o => o.takim === t.isim);
            if (takimOyunculari.length > 0) {
                takimOyunculari.sort((a,b) => b.piyasaDegeri - a.piyasaDegeri);
                let satilan = takimOyunculari[0];
                satilan.takim = 'Serbest';
                t.butce += satilan.piyasaDegeri * 1000000;
                if (channel) channel.send(`🚨 **HACİZ GELDİ!** ${t.isim} kulübü kredi borcunu ödeyemediği için **${satilan.name}** adlı oyuncusunu zorunlu olarak serbest bırakıp satışa çıkardı!`).catch(()=>{});
            }
        }
    }
}

function istatistikGuncelle(ev, dep, evSkor, depSkor, channel) {
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

    Object.values(db.oyuncular).forEach(o => {
        if (o.takim === tEv.isim || o.takim === tDep.isim) {
            if (o.cezali > 0) o.cezali--;
            if (o.sakatlik > 0) o.sakatlik--;
        }
    });

    krediBorcunuDusVeyaHacizUygula(tEv, channel);
    krediBorcunuDusVeyaHacizUygula(tDep, channel);

    veriyiKaydet();
}

async function otomatikSezonBaslatGenel(channel, guild) {
    let aktifTakimlar = Object.values(db.takimlar).filter(t => t.kurucu && t.kurucu !== "Sistem");
    if (aktifTakimlar.length < 5) {
        const errEmbed = new EmbedBuilder().setTitle('❌ SEZON BAŞLATILAMADI').setDescription('Lig sezonunu başlatabilmek için en az **5 takımın** sahibi (Teknik Direktörü) olmalıdır!').setColor('#e74c3c');
        return channel.send({ embeds: [errEmbed] });
    }

    db.otomatikSezonVerisi = { durduruldu: false };
    veriyiKaydet();

    await channel.send({ embeds: [new EmbedBuilder().setTitle('🏆 TENDO LİGİ SEZONU BAŞLADI!').setDescription(`Ligdeki aktif **${aktifTakimlar.length} takım** ile maçlar başlıyor!`).setColor('#9b59b6')] });

    let fikstur = [];
    for (let i = 0; i < aktifTakimlar.length; i++) {
        for (let j = 0; j < aktifTakimlar.length; j++) {
            if (i !== j) {
                fikstur.push({ ev: aktifTakimlar[i].isim, dep: aktifTakimlar[j].isim });
            }
        }
    }
    fikstur.sort(() => Math.random() - 0.5);

    for (let i = 0; i < fikstur.length; i++) {
        if (!db.otomatikSezonVerisi || db.otomatikSezonVerisi.durduruldu) break;

        let mac = fikstur[i];
        await channel.send(`📌 **Lig Maçı ${i + 1} / ${fikstur.length}**`);
        let tamamlandi = await tekilCanliMacOyna(channel, mac.ev, mac.dep, guild);
        if (!tamamlandi) break;

        await new Promise(resolve => setTimeout(resolve, 5000));
    }

    if (db.otomatikSezonVerisi && !db.otomatikSezonVerisi.durduruldu) {
        let puanSiralamasi = [...aktifTakimlar].map(t => db.takimlar[t.isim.toLowerCase()]).sort((a, b) => b.puan - a.puan || b.av - a.av);
        let sampiyon = puanSiralamasi[0];
        sampiyon.butce += 100000000;

        Object.values(db.oyuncular).forEach(o => {
            o.sakatlik = 0;
            o.cezali = 0;
        });

        let sonucMetni = `🏆 **LİG SEZONU SONA ERDİ! ŞAMPİYON: ${sampiyon.isim}**\n💰 **${sampiyon.isim}** şampiyonluk ödülü olarak **+100M€** kazandı!\n\n`;
        puanSiralamasi.forEach((t, index) => {
            sonucMetni += `**${index + 1}. ${t.isim}** - Puan: ${t.puan} | Averaj: ${t.av} | O: ${t.o}\n`;
        });
        await channel.send({ embeds: [new EmbedBuilder().setTitle('🥇 SEZON FİNALİ VE TABLO').setDescription(sonucMetni).setColor('#f1c40f')] });
    }
    db.otomatikSezonVerisi = null;
    veriyiKaydet();
}

client.on('interactionCreate', async interaction => {
    // 1. BUTON ETKİLEŞİMLERİ
    if (interaction.isButton()) {
        const userId = String(interaction.user.id);
        
        if (interaction.customId === 'onayla_11') {
            const veri = db.gecici11ler && db.gecici11ler[userId];
            if (!veri) {
                return interaction.reply({ content: '❌ Bekleyen kadro onay isteğiniz bulunmuyor.', ephemeral: true });
            }

            const kulup = Object.values(db.takimlar).find(t => t.isim === veri.takimIsmi);
            if (!kulup) {
                return interaction.reply({ content: '❌ Bağlı bulunduğunuz takım sistemde bulunamadı!', ephemeral: true });
            }

            if (kulup.butce < veri.toplamMaliyet) {
                return interaction.reply({ content: `❌ İşlem anında kasa bütçeniz yetersiz kaldı! (Gerekli: €${veri.toplamMaliyet.toLocaleString()})`, ephemeral: true });
            }

            kulup.butce -= veri.toplamMaliyet;
            veri.oyuncuIdleri.forEach(id => {
                if (db.oyuncular[id]) db.oyuncular[id].takim = kulup.isim;
            });

            delete db.gecici11ler[userId];
            veriyiKaydet();

            return interaction.update({ 
                embeds: [new EmbedBuilder().setTitle('✅ KADRO BAŞARIYLA TAMAMLANDI!').setDescription(`Kadro **${kulup.isim}** takımınıza aktarıldı.\nHarcanan Bütçe: **€${veri.toplamMaliyet.toLocaleString()}**\nKalan Bütçe: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')],
                components: [] 
            });
        }

        if (interaction.customId === 'reddet_11') {
            if (db.gecici11ler && db.gecici11ler[userId]) {
                delete db.gecici11ler[userId];
                veriyiKaydet();
            }
            return interaction.update({ content: '❌ Otomatik 11 kurulumu iptal edildi.', embeds: [], components: [] });
        }
        return;
    }

    // 2. OTOMATİK TAMAMLAMA (AUTOCOMPLETE)
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        
        if (focusedOption.name === 'mac') {
            const aktifler = db.aktifMaclar ? Object.values(db.aktifMaclar) : [];
            const filtrelenmis = aktifler.filter(m => m.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
            await interaction.respond(
                filtrelenmis.map(m => ({ name: m, value: m }))
            ).catch(() => {});
        }

        if (focusedOption.name === 'takim-adi') {
            const tumTakimlar = Object.values(db.takimlar || {});
            const bosTakimlar = tumTakimlar.filter(t => !t.kurucu || String(t.kurucu).trim() === "");
            const arama = focusedOption.value.toLowerCase();

            const filtrelenmis = bosTakimlar
                .filter(t => t.isim.toLowerCase().includes(arama))
                .slice(0, 25);

            await interaction.respond(
                filtrelenmis.map(t => ({ name: t.isim, value: t.isim }))
            ).catch(() => {});
        }
        return;
    }

    // 3. SLASH KOMUTLARI (CHAT INPUT)
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, channel, guild, member } = interaction;

    // Kanal Kısıtlama Kontrolleri
    if (commandName === 'antrenman' && db.antrenmanKanalId) {
        if (channel.id !== db.antrenmanKanalId) {
            return interaction.reply({
                content: `❌ Antrenman komutu sadece <#${db.antrenmanKanalId}> kanalında kullanılabilir!`,
                ephemeral: true
            });
        }
    }

    const transferKomutlari = ['transfer-teklif', 'transfer-kabul', 'transfer-red', 'serbest-birak', 'futbolcu-havuzu'];
    if (transferKomutlari.includes(commandName) && db.transferKanalAyarlaId) {
        if (channel.id !== db.transferKanalAyarlaId) {
            return interaction.reply({
                content: `❌ Transfer işlemleri sadece <#${db.transferKanalAyarlaId}> kanalında yapılabilir!`,
                ephemeral: true
            });
        }
    }

    const yoneticiAyarKomutlari = ['bot-kanal', 'sponsor-kanal-ayarla', 'transfer-kanal-ayarla', 'antrenman-kanal-ayarla', 'hosgeldin-kanal-ayarla', 'transfermarkt-kanal-ayarla', 'gol-sesi-kanal'];
    const isBotChannel = db.botCalistirmaKanalId && channel.id === db.botCalistirmaKanalId;
    const isSponsorChannel = db.sponsorKanalId && channel.id === db.sponsorKanalId;
    const isAntrenmanChannel = db.antrenmanKanalId && channel.id === db.antrenmanKanalId;

    if (!yoneticiAyarKomutlari.includes(commandName)) {
        if (db.botCalistirmaKanalId && !isBotChannel && !isSponsorChannel && !isAntrenmanChannel && !transferKomutlari.includes(commandName)) {
            return interaction.reply({ 
                content: `❌ Bu botu sadece <#${db.botCalistirmaKanalId}> veya ilgili özel kanallarda kullanabilirsin!`, 
                ephemeral: true 
            });
        }
    }

    try {
        if (!db.oyuncular) db.oyuncular = {};
        if (!db.takimlar) db.takimlar = {};

        if (commandName === 'bot-kanal') {
            const sub = options.getSubcommand();
            if (sub === 'ayarla') {
                const secilenKanal = options.getChannel('kanal');
                db.botCalistirmaKanalId = secilenKanal.id;
                veriyiKaydet();
                return interaction.reply({ content: `✅ Botun komut çalıştırma kanalı başarıyla ${secilenKanal} olarak ayarlandı!`, ephemeral: true });
            } else if (sub === 'kaldır') {
                db.botCalistirmaKanalId = null;
                veriyiKaydet();
                return interaction.reply({ content: `✅ Kanal kısıtlaması kaldırıldı!`, ephemeral: true });
            }
        }

        if (commandName === 'transfer-kanal-ayarla') {
            const secilenKanal = options.getChannel('kanal');
            db.transferKanalAyarlaId = secilenKanal.id;
            veriyiKaydet();
            return interaction.reply({ content: `✅ Transfer komutlarının kullanılacağı kanal başarıyla ${secilenKanal} olarak ayarlandı!`, ephemeral: true });
        }

        if (commandName === 'antrenman-kanal-ayarla') {
            const secilenKanal = options.getChannel('kanal');
            db.antrenmanKanalId = secilenKanal.id;
            veriyiKaydet();
            return interaction.reply({ content: `✅ Antrenman komutunun kullanılacağı kanal başarıyla ${secilenKanal} olarak ayarlandı!`, ephemeral: true });
        }

        if (commandName === 'twitter') {
            const mesaj = options.getString('mesaj');
            const displayName = member ? member.displayName : user.username;
            const twitterEmbed = new EmbedBuilder()
                .setColor(0x000000)
                .setAuthor({ name: `${displayName} (@${user.username})`, iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setDescription(mesaj)
                .setFooter({ text: 'Twitter • Discord Entegrasyonu' })
                .setTimestamp();
            return interaction.reply({ embeds: [twitterEmbed] });
        }

        if (commandName === 'rehber') {
            const rehberEmbed = new EmbedBuilder()
                .setTitle('📖 TENDO LİGİ - OYUN REHBERİ')
                .addFields(
                    { name: '1️⃣ Takım & Kadro', value: '`/takim-sec` ile takım seçip, `/oto-ilk11` ile kadro kurabilirsin.' },
                    { name: '2️⃣ Antrenman', value: '`/antrenman` ile oyuncularını 1 saatte 1 geliştirip değerini artırabilirsin.' },
                    { name: '3️⃣ Banka / Kredi', value: '`/kredi-cek` ile %10 faizle nakit çekebilir, ödemezsen haciz gelebilir!' },
                    { name: '4️⃣ Takvim & Sezon', value: '`/takvim` üzerinden sezonu başlatabilirsin (En az 5 takım gerekir).' }
                )
                .setColor('#3498db');
            return interaction.reply({ embeds: [rehberEmbed] });
        }

        if (commandName === 'takvim') {
            const sub = options.getSubcommand ? options.getSubcommand() : 'goster';
            if (sub === 'sezon-baslat') {
                await interaction.deferReply();
                await otomatikSezonBaslatGenel(channel, guild);
                return interaction.followUp({ content: "⚽ Sezon başlatma işlemi başlatıldı." });
            }

            const aktifler = db.aktifMaclar ? Object.values(db.aktifMaclar) : [];
            let aciklama = "";
            if (aktifler.length > 0) {
                aciklama += `🔴 **Canlı Maçlar:**\n`;
                aktifler.forEach(mac => { aciklama += `• ${mac}\n`; });
                aciklama += `\n`;
            } else {
                aciklama += `🟢 Şu an canlı maç yok.\n\n`;
            }
            aciklama += `📅 Komutlar:\n• \`/takvim sezon-baslat\` ile lig sezonunu başlatabilirsiniz (En az 5 takım gerekir).\n`;

            const takvimEmbed = new EmbedBuilder()
                .setTitle('⚽ TENDO LİGİ - MAÇ TAKVİMİ')
                .setDescription(aciklama)
                .setColor('#2ecc71');

            return interaction.reply({ embeds: [takvimEmbed] });
        }

        if (commandName === 'antrenman') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Önce bir takım seçmelisin! (`/takim-sec`)', ephemeral: true });

            const simdi = Date.now();
            const birSaat = 60 * 60 * 1000;
            if (kulup.sonAntrenman && (simdi - kulup.sonAntrenman < birSaat)) {
                const kalanDakika = Math.ceil((birSaat - (simdi - kulup.sonAntrenman)) / (60 * 1000));
                return interaction.reply({ content: `⏳ Antrenman için **${kalanDakika} dakika** beklemelisin!`, ephemeral: true });
            }

            const oyuncuAdi = options.getString('futbolcu-adi').toLowerCase();
            const oyuncu = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(oyuncuAdi) && o.takim === kulup.isim);
            if (!oyuncu) return interaction.reply({ content: '❌ Kadronuzda böyle bir oyuncu bulunamadı!', ephemeral: true });

            oyuncu.piyasaDegeri = Math.round((oyuncu.piyasaDegeri * 1.03) * 10) / 10;
            oyuncu.gol = (oyuncu.gol || 0) + (Math.random() < 0.3 ? 1 : 0);
            oyuncu.asist = (oyuncu.asist || 0) + (Math.random() < 0.3 ? 1 : 0);

            kulup.sonAntrenman = simdi;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏋️ ANTRENMAN BAŞARILI!').setDescription(`**${oyuncu.name}** antrenmana katıldı!\n📈 Yeni Piyasa Değeri: **${oyuncu.piyasaDegeri}M€**`).setColor('#2ecc71')] });
        }

        if (commandName === 'kredi-cek') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Önce bir takım seçmelisin! (`/takim-sec`)', ephemeral: true });

            const miktarMilyon = options.getInteger('miktar');
            if (miktarMilyon <= 0) return interaction.reply({ content: '❌ Geçerli bir miktar girin.', ephemeral: true });

            const gercekMaliyet = miktarMilyon * 1000000;
            const geriOdeme = Math.round(gercekMaliyet * 1.10);

            kulup.butce += gercekMaliyet;
            kulup.krediBorc = (kulup.krediBorc || 0) + geriOdeme;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏦 KREDİ ÇEKİLDİ').setDescription(`Kasanıza **+${miktarMilyon}M€** eklendi.\n📊 Toplam Borç (%10 faizle): **€${kulup.krediBorc.toLocaleString()}**`).setColor('#f1c40f')] });
        }

        if (commandName === 'kredi-ode') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Takımınız yok. (`/takim-sec`)', ephemeral: true });

            const miktarMilyon = options.getInteger('miktar');
            const gercekMiktar = miktarMilyon * 1000000;

            if (kulup.butce < gercekMiktar) return interaction.reply({ content: '❌ Kasanızda bu kadar para yok!', ephemeral: true });
            if (!kulup.krediBorc || kulup.krediBorc <= 0) return interaction.reply({ content: 'ℹ️ Bankaya ödenmesi gereken borcunuz bulunmuyor.', ephemeral: true });

            let odenecek = Math.min(gercekMiktar, kulup.krediBorc);
            kulup.butce -= odenecek;
            kulup.krediBorc -= odenecek;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💳 KREDİ ÖDENDİ').setDescription(`Borçtan **€${odenecek.toLocaleString()}** ödendi.\nKalan Borç: **€${kulup.krediBorc.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'hosgeldin-kanal-ayarla') {
            db.hosgeldinKanalId = options.getChannel('kanal').id;
            veriyiKaydet();
            return interaction.reply({ content: '✅ Hoş geldin kanalı ayarlandı!', ephemeral: true });
        }

        if (commandName === 'sponsor-kanal-ayarla') {
            db.sponsorKanalId = options.getChannel('kanal').id;
            veriyiKaydet();
            return interaction.reply({ content: '✅ Sponsor kanalı ayarlandı!', ephemeral: true });
        }

        if (commandName === 'kayıt') {
            const hedefUye = options.getMember('kullanici');
            const yeniIsim = options.getString('isim');
            const yas = options.getInteger('yas');
            await hedefUye.setNickname(`${yeniIsim} | ${yas}`);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ KAYIT BAŞARILI').setDescription(`**${hedefUye.user.tag}** kayıt edildi!`).setColor('#2ecc71')] });
        }

        if (commandName === 'futbolcu-havuzu') {
            const sayfa = options.getInteger('sayfa') || 1;
            const oyuncular = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
            const limit = 20;
            const maxSayfa = Math.ceil(oyuncular.length / limit) || 1;
            const baslangic = (sayfa - 1) * limit;
            let liste = "";
            oyuncular.slice(baslangic, baslangic + limit).forEach((f, i) => {
                liste += `**${baslangic + i + 1}. ${f.name}** | ${f.mevki} | Değer: **${f.piyasaDegeri}M€**\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 TRANSFER HAVUZU (${sayfa}/${maxSayfa})`).setDescription(liste || 'Havuzda futbolcu yok.').setColor('#3498db')] });
        }

        if (commandName === 'oto-ilk11') {
            await interaction.deferReply();
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.editReply({ content: '❌ Bir takımınız yok! Önce `/takim-sec` komutunu kullanın.' });

            const dizilisStr = options.getString('dizilis');
            const hedefButceMilyon = options.getInteger('butce');
            const hedefButceGercek = hedefButceMilyon * 1000000;

            if (kulup.butce < hedefButceGercek) {
                return interaction.editReply({ content: `❌ Kasa yetersiz! Mevcut Kasa: **€${kulup.butce.toLocaleString()}**, İstenen: **€${hedefButceGercek.toLocaleString()}**` });
            }

            const parcalar = dizilisStr.split('-').map(Number);
            const serbestler = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');

            if (serbestler.length < 11) return interaction.editReply({ content: '❌ Yeterli serbest oyuncu yok!' });

            const altLimit = hedefButceGercek * 0.97;
            
            let enIyiSecimler = [];
            let enIyiMaliyet = 0;

            const klListesi = serbestler.filter(o => o.mevki === 'KL');
            const dfListesi = serbestler.filter(o => o.mevki === 'DF' || o.mevki === 'STP');
            const osListesi = serbestler.filter(o => o.mevki === 'OS' || o.mevki === 'KANAT');
            const sntListesi = serbestler.filter(o => o.mevki === 'SNT');

            for (let deneme = 0; deneme < 3000; deneme++) {
                let secilenler = [];
                let toplamBonservis = 0;
                let seciliset = new Set();

                function rastgeleSec(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

                let kl = rastgeleSec(klListesi.length ? klListesi : serbestler);
                secilenler.push(kl); 
                seciliset.add(kl.id);
                toplamBonservis += kl.piyasaDegeri * 1000000;

                let basarili = true;
                function ekle(liste, adet) {
                    for(let i = 0; i < adet; i++) {
                        let havuz = (liste.length ? liste : serbestler).filter(o => !seciliset.has(o.id));
                        if(!havuz.length) { basarili = false; break; }
                        let o = rastgeleSec(havuz);
                        seciliset.add(o.id);
                        secilenler.push(o);
                        toplamBonservis += o.piyasaDegeri * 1000000;
                    }
                }

                ekle(dfListesi, parcalar[0] || 0);
                ekle(osListesi, parcalar[1] || 0);
                ekle(sntListesi, parcalar[2] || 0);

                if (basarili && toplamBonservis <= hedefButceGercek) {
                    if (toplamBonservis > enIyiMaliyet) {
                        enIyiMaliyet = toplamBonservis;
                        enIyiSecimler = secilenler;
                    }
                    if (toplamBonservis >= altLimit) {
                        break;
                    }
                }
            }

            if (enIyiSecimler.length < 11) return interaction.editReply({ content: '❌ Bu bütçeye veya dizilişe uygun kadro bulunamadı.' });

            if (!db.gecici11ler) db.gecici11ler = {};
            db.gecici11ler[String(user.id)] = { 
                takimIsmi: kulup.isim, 
                oyuncuIdleri: enIyiSecimler.map(o => o.id), 
                toplamMaliyet: enIyiMaliyet, 
                dizilis: dizilisStr 
            };
            veriyiKaydet();

            let liste = "";
            enIyiSecimler.forEach((o, i) => { liste += `${i+1}. ${o.name} (${o.mevki}) - ${o.piyasaDegeri}M€\n`; });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('onayla_11').setLabel('✅ Kadroyu Onayla').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('reddet_11').setLabel('❌ İptal Et').setStyle(ButtonStyle.Danger)
            );

            const kullanimOrani = ((enIyiMaliyet / hedefButceGercek) * 100).toFixed(1);

            return interaction.editReply({ 
                embeds: [new EmbedBuilder()
                    .setTitle(`⚡ KADRO ÖNİZLEMESİ | ${kulup.isim}`)
                    .setDescription(`💰 **Hedef Bütçe:** ${(hedefButceMilyon)}M€\n📊 **Harcanan:** ${(enIyiMaliyet/1000000).toFixed(1)}M€ (%${kullanimOrani} Kullanıldı)\n\n${liste}\n\nAşağıdaki butonlardan onaylayabilir veya \`/11-onayla\` yazabilirsiniz.`)
                    .setColor('#f1c40f')],
                components: [row]
            });
        }

        if (commandName === '11-onayla') {
            const userIdStr = String(user.id);
            const veri = db.gecici11ler && db.gecici11ler[userIdStr];
            if (!veri) return interaction.reply({ content: '❌ Onay bekleyen kadro bulunamadı.', ephemeral: true });
            const kulup = Object.values(db.takimlar).find(t => t.isim === veri.takimIsmi);

            if (!kulup) return interaction.reply({ content: '❌ Takımınız bulunamadı.', ephemeral: true });
            if (kulup.butce < veri.toplamMaliyet) return interaction.reply({ content: '❌ Kasa bütçeniz artık yetersiz!', ephemeral: true });

            kulup.butce -= veri.toplamMaliyet;
            veri.oyuncuIdleri.forEach(id => { if (db.oyuncular[id]) db.oyuncular[id].takim = kulup.isim; });
            delete db.gecici11ler[userIdStr];
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ KADRO BAŞARIYLA KURULDU!').setDescription(`Oyuncular **${kulup.isim}** takımınıza eklendi. Kalan Kasa: **€${kulup.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === '11-reddet') {
            const userIdStr = String(user.id);
            if (db.gecici11ler && db.gecici11ler[userIdStr]) delete db.gecici11ler[userIdStr];
            veriyiKaydet();
            return interaction.reply({ content: '❌ Teklif reddedildi ve temizlendi.', ephemeral: true });
        }

        if (commandName === 'tahmin') {
            const secilenMac = options.getString('mac');
            const skor = options.getString('skor').trim();
            if (!db.aktifMaclar || !db.aktifMaclar[secilenMac.toLowerCase()]) return interaction.reply({ content: '❌ Maç aktif değil.', ephemeral: true });
            if (!db.kullanilanTahminler) db.kullanilanTahminler = {};
            if (db.kullanilanTahminler[user.id]) return interaction.reply({ content: '❌ Hakkınız bitti.', ephemeral: true });

            if (!db.macTahminleri) db.macTahminleri = {};
            db.macTahminleri[user.id] = { mac: secilenMac, skor: skor };
            db.kullanilanTahminler[user.id] = true;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎯 TAHMİN ALINDI').setDescription(`Tahmin: ${skor}`).setColor('#3498db')] });
        }

        if (commandName === 'transfermarkt-kanal-ayarla') {
            db.transferKanalId = options.getChannel('kanal').id;
            veriyiKaydet();
            return interaction.reply({ content: '✅ Kanal ayarlandı!', ephemeral: true });
        }

        if (commandName === 'serbest-birak') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Takımınız yok. (`/takim-sec`)', ephemeral: true });

            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(options.getString('futbolcu-adi').toLowerCase()) && o.takim === kulup.isim);
            if (!f) return interaction.reply({ content: '❌ Oyuncu yok.', ephemeral: true });
            f.takim = 'Serbest';
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🚪 SERBEST BIRAKILDI').setColor('#e74c3c')] });
        }

        if (commandName === 'transfer-teklif') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Takımınız yok. (`/takim-sec`)', ephemeral: true });

            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(options.getString('futbolcu-adi').toLowerCase()));
            if (!f) return interaction.reply({ content: '❌ Oyuncu yok.', ephemeral: true });

            if (!db.transferPazari) db.transferPazari = {};
            db.transferPazari[f.id] = { alanKulup: kulup.isim, bonservis: options.getInteger('bonservis'), gercekBonservis: options.getInteger('bonservis')*1000000, maas: options.getInteger('haftalik-maas') };
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📩 TEKLİF YAPILDI').setColor('#3498db')] });
        }

        if (commandName === 'transfer-kabul') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Takımınız yok. (`/takim-sec`)', ephemeral: true });

            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(options.getString('futbolcu-adi').toLowerCase()));
            if (!f) return interaction.reply({ content: '❌ Oyuncu bulunamadı.', ephemeral: true });

            const teklif = db.transferPazari && db.transferPazari[f.id];
            const tutar = teklif ? teklif.gercekBonservis : f.piyasaDegeri * 1000000;

            if (kulup.butce < tutar) return interaction.reply({ content: '❌ Kasa yetersiz!', ephemeral: true });

            const eskiTakimKey = f.takim ? f.takim.toLowerCase() : null;
            if (eskiTakimKey && db.takimlar[eskiTakimKey]) {
                db.takimlar[eskiTakimKey].butce += tutar;
            }

            kulup.butce -= tutar;
            f.takim = kulup.isim;
            if (teklif) f.maas = teklif.maas;
            delete db.transferPazari[f.id];
            
            veriyiKaydet();
            await transferDuyurusuGonder(guild, kulup.isim, f.name, tutar / 1000000, f.maas);
            
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 TRANSFER BAŞARILI!').setDescription(`**${f.name}**, ${tutar/1000000}M€ karşılığında transfer edildi!`).setColor('#2ecc71')] });
        }

        if (commandName === 'transfer-red') {
            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(options.getString('futbolcu-adi').toLowerCase()));
            if (f && db.transferPazari) delete db.transferPazari[f.id];
            veriyiKaydet();
            return interaction.reply({ content: '❌ Reddedildi.', ephemeral: true });
        }

        if (commandName === 'kadrom') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.reply({ content: '❌ Bir takımınız bulunmuyor! Önce `/takim-sec` kullanın.', ephemeral: true });

            const oyuncularim = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            let liste = "";
            let toplamMaas = 0;
            oyuncularim.forEach((f, i) => {
                toplamMaas += f.maas;
                let durum = "";
                if (f.sakatlik > 0) durum = " 🚑 (Sakat)";
                else if (f.cezali > 0) durum = " 🟥 (Cezalı)";
                liste += `${i+1}. ${f.name} | ${f.mevki} | Gol: ${f.gol} | Asist: ${f.asist}${durum}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ KADROM | ${kulup.isim}`).setDescription(liste || 'Kadronuzda oyuncu yok.').addFields({ name: '💸 Toplam Maaş', value: `€${toplamMaas.toLocaleString()}` }).setColor('#f1c40f')] });
        }

        if (commandName === 'takimlar') {
            let liste = "";
            Object.values(db.takimlar).forEach((t, i) => {
                liste += `${i+1}. ${t.isim} | T.D: ${t.kurucu ? `<@${t.kurucu}>` : 'Boş'} | Kasa: €${t.butce.toLocaleString()}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ TAKIMLAR').setDescription(liste || 'Takım bulunamadı.').setColor('#3498db')] });
        }

        if (commandName === 'takim-sec') {
            const takimAdiInput = options.getString('takim-adi').trim();
            const targetKey = takimAdiInput.toLowerCase();
            const userIdStr = String(user.id);

            const secilmekIstenenTakim = db.takimlar[targetKey];

            if (secilmekIstenenTakim && secilmekIstenenTakim.kurucu && String(secilmekIstenenTakim.kurucu).trim() !== "" && String(secilmekIstenenTakim.kurucu).trim() !== userIdStr) {
                return interaction.reply({ 
                    content: `❌ **${secilmekIstenenTakim.isim}** takımının zaten bir Teknik Direktörü var (<@${secilmekIstenenTakim.kurucu}>)! Lütfen T.D.'si olmayan boş bir takım seçin.`, 
                    ephemeral: true 
                });
            }

            Object.values(db.takimlar).forEach(t => {
                if (t.kurucu && String(t.kurucu).trim() === userIdStr) {
                    t.kurucu = null;
                }
            });

            if (!db.takimlar[targetKey]) {
                db.takimlar[targetKey] = { 
                    isim: takimAdiInput, 
                    kurucu: userIdStr, 
                    puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0, 
                    butce: 150000000, 
                    sonSponsor: 0, sonAntrenman: 0, krediBorc: 0 
                };
            } else {
                db.takimlar[targetKey].kurucu = userIdStr;
            }

            veriyiKaydet();
            return interaction.reply({ 
                embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Tebrikler <@${user.id}>, **${db.takimlar[targetKey].isim}** takımının Teknik Direktörü oldun!`).setColor('#2ecc71')] 
            });
        }

        if (commandName === 'mac-yap') {
            const ev = kullanicininTakiminiBulVeyaAta(user.id);
            if (!ev) return interaction.reply({ content: '❌ Bir takımınız yok! Önce `/takim-sec` yapmalısınız.', ephemeral: true });

            const dep = db.takimlar[options.getString('rakip-takim').trim().toLowerCase()];
            if (!dep) return interaction.reply({ content: '❌ Rakip takım bulunamadı.', ephemeral: true });
            
            db.kullanilanTahminler = {};
            veriyiKaydet();
            await interaction.reply({ content: `⚔️ ${ev.isim} vs ${dep.isim} maçı başlıyor!` });
            await tekilCanliMacOyna(channel, ev.isim, dep.isim, guild);
            return;
        }

        if (commandName === '3-takimli-sezon') {
            await interaction.deferReply();
            const takimlarVerisi = [
                { isim: options.getString('takim1').trim(), td: options.getUser('td1') },
                { isim: options.getString('takim2').trim(), td: options.getUser('td2') },
                { isim: options.getString('takim3').trim(), td: options.getUser('td3') }
            ];
            takimlarVerisi.forEach(tv => {
                const k = tv.isim.toLowerCase();
                if (!db.takimlar[k]) {
                    db.takimlar[k] = { isim: tv.isim, kurucu: String(tv.td.id), puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0, butce: 150000000, sonSponsor: 0, sonAntrenman: 0, krediBorc: 0 };
                } else {
                    db.takimlar[k].kurucu = String(tv.td.id);
                }
            });
            veriyiKaydet();

            await interaction.editReply({ content: `🚀 3 Takımlı Sezon Başlatıldı! Maçlar Simüle Ediliyor...` });

            // 3 Takım Arasında Çift Devreli Maçlar
            const fikstur3 = [
                { ev: takimlarVerisi[0].isim, dep: takimlarVerisi[1].isim },
                { ev: takimlarVerisi[1].isim, dep: takimlarVerisi[2].isim },
                { ev: takimlarVerisi[2].isim, dep: takimlarVerisi[0].isim },
                { ev: takimlarVerisi[1].isim, dep: takimlarVerisi[0].isim },
                { ev: takimlarVerisi[2].isim, dep: takimlarVerisi[1].isim },
                { ev: takimlarVerisi[0].isim, dep: takimlarVerisi[2].isim }
            ];

            for (const m of fikstur3) {
                await tekilCanliMacOyna(channel, m.ev, m.dep, guild);
                await new Promise(r => setTimeout(r, 3000));
            }
            return;
        }

        if (commandName === 'mac-durdur') {
            if (db.otomatikSezonVerisi) db.otomatikSezonVerisi.durduruldu = true;
            db.aktifMaclar = {};
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛑 DURDURULDU').setColor('#e74c3c')] });
        }

        if (commandName === 'gol-kralligi') {
            const list = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            let s = "";
            list.forEach((o, i) => { s += `${i+1}. ${o.name} (${o.takim}) - ${o.gol} Gol\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(s || 'Henüz gol atılmadı.').setColor('#e67e22')] });
        }

        if (commandName === 'asist-kralligi') {
            const list = Object.values(db.oyuncular).filter(o => o.asist > 0).sort((a, b) => b.asist - a.asist).slice(0, 10);
            let s = "";
            list.forEach((o, i) => { s += `${i+1}. ${o.name} (${o.takim}) - ${o.asist} Asist\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🅰️ ASİST KRALLIĞI').setDescription(s || 'Henüz asist yapılmadı.').setColor('#9b59b6')] });
        }

        if (commandName === 'gol-sesi-kanal') {
            golKanalId = options.getChannel('kanal').id;
            return interaction.reply({ content: '✅ Ses kanalı ayarlandı.', ephemeral: true });
        }

        if (commandName === 'sponsor') {
            const k = kullanicininTakiminiBulVeyaAta(user.id);
            if (!k) return interaction.reply({ content: '❌ Önce bir takım seçmelisin! (`/takim-sec`)', ephemeral: true });

            const simdi = Date.now();
            const birSaat = 60 * 60 * 1000;

            if (k.sonSponsor && (simdi - k.sonSponsor < birSaat)) {
                const kalanDakika = Math.ceil((birSaat - (simdi - k.sonSponsor)) / (60 * 1000));
                return interaction.reply({ 
                    content: `⏳ Sponsor geliri almak için **${kalanDakika} dakika** daha beklemelisiniz!`, 
                    ephemeral: true 
                });
            }

            k.butce += 20000000;
            k.sonSponsor = simdi;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR GELİRİ').setDescription(`+€20,000,000 eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const k = kullanicininTakiminiBulVeyaAta(user.id);
            if (!k) {
                return interaction.reply({ content: '❌ Henüz bir takımınız bulunmuyor! Önce `/takim-sec` komutu ile bir takıma teknik direktör olmalısınız.', ephemeral: true });
            }
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe | ${k.isim}`).setDescription(`Kasa: €${k.butce.toLocaleString()}\nKredi Borcu: €${(k.krediBorc || 0).toLocaleString()}`).setColor('#2ecc71')] });
        }

        if (commandName === 'butce-ver') {
            const takimInput = options.getString('takim-adi').trim().toLowerCase();
            const miktar = options.getInteger('miktar');
            const t = db.takimlar[takimInput];

            if (!t) {
                return interaction.reply({ content: `❌ **${options.getString('takim-adi')}** isimli takım sistemde bulunamadı!`, ephemeral: true });
            }

            t.butce += miktar * 1000000;
            veriyiKaydet();
            return interaction.reply({ content: `✅ **${t.isim}** takımına **+€${(miktar * 1000000).toLocaleString()}** bütçe eklendi. Güncel Kasa: **€${t.butce.toLocaleString()}**`, ephemeral: true });
        }

        if (commandName === 'puan-durumu') {
            let s = "";
            Object.values(db.takimlar).sort((a,b)=>b.puan-a.puan || b.av-a.av).forEach((t,i)=>{ s+=`${i+1}. ${t.isim} - Puan: ${t.puan} | Averaj: ${t.av}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(s || 'Tablo boş.').setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            await interaction.deferReply();
            await otomatikSezonBaslatGenel(channel, guild);
            return interaction.followUp({ content: "⚽ Sezon süreci tamamlandı." });
        }

        if (commandName === 'sezon-durdur') {
            db.sezonAktif = false;
            if (db.otomatikSezonVerisi) db.otomatikSezonVerisi.durduruldu = true;
            veriyiKaydet();
            return interaction.reply({ content: '🛑 Sezon durduruldu.', ephemeral: true });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => { t.puan=0; t.av=0; t.o=0; t.g=0; t.b=0; t.m=0; t.krediBorc=0; t.sonSponsor=0; });
            db.kullanilanTahminler = {};
            db.aktifMaclar = {};
            veriyiKaydet();
            return interaction.reply({ content: '🔄 Lig sıfırlandı.', ephemeral: true });
        }

    } catch (err) {
        console.error("Komut işleme hatası:", err);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ content: '❌ İşlem sırasında bir hata oluştu.', ephemeral: true }).catch(() => {});
        }
    }
});

client.login(token);
