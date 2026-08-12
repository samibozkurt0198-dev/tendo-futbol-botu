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
    gecici11ler: {},
    macTahminleri: {},
    kullanilanTahminler: {},
    aktifMaclar: {},
    sezonAktif: false,
    transferKanalId: null,
    otomatikSezonVerisi: null
};

if (fs.existsSync(DB_FILE)) {
    try {
        const dosyaVerisi = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        if (dosyaVerisi.oyuncular && Object.keys(dosyaVerisi.oyuncular).length > 0) db.oyuncular = dosyaVerisi.oyuncular;
        if (dosyaVerisi.takimlar && Object.keys(dosyaVerisi.takimlar).length > 0) db.takimlar = dosyaVerisi.takimlar;
        if (dosyaVerisi.transferPazari) db.transferPazari = dosyaVerisi.transferPazari;
        if (dosyaVerisi.gecici11ler) db.gecici11ler = dosyaVerisi.gecici11ler;
        if (dosyaVerisi.macTahminleri) db.macTahminleri = dosyaVerisi.macTahminleri;
        if (dosyaVerisi.kullanilanTahminler) db.kullanilanTahminler = dosyaVerisi.kullanilanTahminler;
        if (dosyaVerisi.aktifMaclar) db.aktifMaclar = dosyaVerisi.aktifMaclar;
        if (dosyaVerisi.sezonAktif !== undefined) db.sezonAktif = dosyaVerisi.sezonAktif;
        if (dosyaVerisi.transferKanalId) db.transferKanalId = dosyaVerisi.transferKanalId;
        if (dosyaVerisi.otomatikSezonVerisi) db.otomatikSezonVerisi = dosyaVerisi.otomatikSezonVerisi;
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
    const temizId = String(userId).trim();
    let bul = Object.values(db.takimlar).find(t => t.kurucu && String(t.kurucu).trim() === temizId);
    if (bul) return bul;

    let galatasaray = db.takimlar['galatasaray'];
    if (galatasaray && (!galatasaray.kurucu || galatasaray.kurucu === "Sistem")) {
        galatasaray.kurucu = temizId;
        veriyiKaydet();
        return galatasaray;
    }

    let bosTakim = Object.values(db.takimlar).find(t => !t.kurucu || t.kurucu === "Sistem");
    if (bosTakim) {
        bosTakim.kurucu = temizId;
        veriyiKaydet();
        return bosTakim;
    }

    return null;
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
        .setName('oto-ilk11')
        .setDescription('Belirttiğin bütçenin %95-99 unu kullanarak en iyi 11 oyuncuyu seçer.')
        .addStringOption(opt => opt.setName('dizilis').setDescription('Örn: 4-3-3, 4-4-2').setRequired(true))
        .addIntegerOption(opt => opt.setName('butce').setDescription('Harcanacak toplam bütçe (Milyon €)').setRequired(true)),

    new SlashCommandBuilder()
        .setName('11-onayla')
        .setDescription('Önizlemesi yapılan otomatik ilk 11 kadrosunu onaylayıp takımınıza katar.'),

    new SlashCommandBuilder()
        .setName('11-reddet')
        .setDescription('Önizlemesi yapılan otomatik ilk 11 teklifini reddeder.'),

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
        .addStringOption(opt => opt.setName('takim-adi').setDescription('Takım adı').setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('mac-yap')
        .setDescription('Canlı maç yaparsınız.')
        .addStringOption(opt => opt.setName('rakip-takim').setDescription('Rakip takım adı').setRequired(true)),

    new SlashCommandBuilder()
        .setName('3-takimli-sezon')
        .setDescription('3 takımlı, 10 maçlık otomatik özel sezon başlatır.')
        .addStringOption(opt => opt.setName('takim1').setDescription('1. Takım Adı (Örn: Galatasaray)').setRequired(true))
        .addUserOption(opt => opt.setName('td1').setDescription('1. Takımın Teknik Direktörü').setRequired(true))
        .addStringOption(opt => opt.setName('takim2').setDescription('2. Takım Adı (Örn: Beşiktaş)').setRequired(true))
        .addUserOption(opt => opt.setName('td2').setDescription('2. Takımın Teknik Direktörü').setRequired(true))
        .addStringOption(opt => opt.setName('takim3').setDescription('3. Takım Adı (Örn: Real Madrid)').setRequired(true))
        .addUserOption(opt => opt.setName('td3').setDescription('3. Takımın Teknik Direktörü').setRequired(true)),

    new SlashCommandBuilder()
        .setName('mac-durdur')
        .setDescription('Devam eden otomatik 3 takımlı sezonu veya maçları durdurur.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

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
    { metin: "{dakika}' - ⚽ **GOOOOL!** {hücum} takımından **{oyuncu}** harika bir vuruşla fileleri havalandırdı! Asist: **{asist}**. Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - ⚽ **MÜTHİŞ GOL!** {hücum} yıldızı **{oyuncu}** tribünleri coşturan muhteşem bir gol attı! Harika pası veren: **{asist}**. Skor: {skor}", tip: "gol" },
    { metin: "{dakika}' - 🧤 **HARİKA KURTARIŞ!** {hücum} atağında **{oyuncu}** şutunu çekti ama kaleci devleşti.", tip: "normal" },
    { metin: "{dakika}' - 💥 **DIŞARI GİTTİ!** {hücum} oyuncusu **{oyuncu}** sert vurdu, top az farkla auta çıktı.", tip: "normal" },
    { metin: "{dakika}' - 📐 **KORNER!** {hücum} köşe vuruşu kazandı, tehlikeli orta geliyor.", tip: "normal" },
    { metin: "{dakika}' - ❌ **DİREKTEN DÖNDÜ!** {hücum} atağında **{oyuncu}** vurdu, direkten döndü!", tip: "normal" },
    { metin: "{dakika}' - 🟨 **SARI KART!** {defans} takımından sert müdahale.", tip: "normal" }
];

function futbolcuSecPozisyonaGore(takimAdi, tip, haricId = null) {
    if (!db.oyuncular) db.oyuncular = {};
    const takimOyunculari = Object.values(db.oyuncular).filter(o => o.takim === takimAdi && !o.sakatlik && !o.cezali && o.id !== haricId);
    
    const havuz = takimOyunculari.length > 0 ? takimOyunculari : Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
    if (havuz.length === 0) return { name: "Bilinmeyen Oyuncu", id: null, mevki: "OS" };

    if (tip === "gol") {
        const sntVeyaKanat = havuz.filter(o => o.mevki === 'SNT' || o.mevki === 'KANAT');
        const ortaSaha = havuz.filter(o => o.mevki === 'OS');
        const defansVeKL = havuz.filter(o => o.mevki === 'STP' || o.mevki === 'DF' || o.mevki === 'KL');

        const sans = Math.random();
        if (sans < 0.75 && sntVeyaKanat.length > 0) {
            return sntVeyaKanat[Math.floor(Math.random() * sntVeyaKanat.length)];
        } else if (sans < 0.93 && ortaSaha.length > 0) {
            return ortaSaha[Math.floor(Math.random() * ortaSaha.length)];
        } else if (defansVeKL.length > 0) {
            return defansVeKL[Math.floor(Math.random() * defansVeKL.length)];
        }
    } else if (tip === "asist") {
        const osVeyaKanat = havuz.filter(o => o.mevki === 'OS' || o.mevki === 'KANAT');
        const digerleri = havuz.filter(o => o.mevki !== 'OS' && o.mevki !== 'KANAT');

        const sans = Math.random();
        if (sans < 0.80 && osVeyaKanat.length > 0) {
            return osVeyaKanat[Math.floor(Math.random() * osVeyaKanat.length)];
        } else if (digerleri.length > 0) {
            return digerleri[Math.floor(Math.random() * digerleri.length)];
        }
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
                istatistikGuncelle(evSahibi, deplasman, evSkor, depSkor);
                tahminleriKontrolEtVeOdulVer(evSahibi, deplasman, evSkor, depSkor, channel);
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
            
            let golAtan = futbolcuSecPozisyonaGore(hucumTakim, "gol");
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
        tEv.butce += 2000000;
    } else {
        tEv.puan += 1; tEv.b++;
        tDep.puan += 1; tDep.b++;
        tEv.butce += 1000000; tDep.butce += 1000000;
    }
    veriyiKaydet();
}

async function otomatikUcluSezonBaslat(channel, takimlarListesi, guild) {
    db.otomatikSezonVerisi = { durduruldu: false, oynananMac: 0 };
    veriyiKaydet();

    await channel.send({ embeds: [new EmbedBuilder().setTitle('🏆 3 TAKIMLI ÖZEL SEZON BAŞLADI!').setDescription(`Takımlar: **${takimlarListesi.map(t => t.isim).join(', ')}**\nToplam **10 Maçlık** heyecan başlıyor!`).setColor('#9b59b6')] });

    for (let i = 1; i <= 10; i++) {
        if (!db.otomatikSezonVerisi || db.otomatikSezonVerisi.durduruldu) break;

        let evIdx = Math.floor(Math.random() * takimlarListesi.length);
        let depIdx;
        do {
            depIdx = Math.floor(Math.random() * takimlarListesi.length);
        } while (depIdx === evIdx);

        let evTakim = takimlarListesi[evIdx].isim;
        let depTakim = takimlarListesi[depIdx].isim;

        await channel.send(`📌 **Sezon Maçı ${i} / 10**`);
        let tamamlandi = await tekilCanliMacOyna(channel, evTakim, depTakim, guild);
        if (!tamamlandi) break;

        if (i < 10) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    if (db.otomatikSezonVerisi && !db.otomatikSezonVerisi.durduruldu) {
        let puanSiralamasi = [...takimlarListesi].map(t => db.takimlar[t.isim.toLowerCase()]).sort((a, b) => b.puan - a.puan || b.av - a.av);
        let sonucMetni = `🏆 **3 TAKIMLI SEZON SONA ERDİ!**\n\n`;
        puanSiralamasi.forEach((t, index) => {
            sonucMetni += `**${index + 1}. ${t.isim}** - Puan: ${t.puan} | Averaj: ${t.av} | O: ${t.o} (G: ${t.g}, B: ${t.b}, M: ${t.m})\n`;
        });
        await channel.send({ embeds: [new EmbedBuilder().setTitle('🥇 SEZON FİNALİ VE ŞAMPİYON').setDescription(sonucMetni).setColor('#f1c40f')] });
    }
    db.otomatikSezonVerisi = null;
    veriyiKaydet();
}

client.on('interactionCreate', async interaction => {
    if (interaction.isAutocomplete()) {
        const focusedOption = interaction.options.getFocused(true);
        if (focusedOption.name === 'mac') {
            const aktifler = db.aktifMaclar ? Object.values(db.aktifMaclar) : [];
            const filtrelenmis = aktifler.filter(m => m.toLowerCase().includes(focusedOption.value.toLowerCase())).slice(0, 25);
            await interaction.respond(
                filtrelenmis.map(m => ({ name: m, value: m }))
            ).catch(() => {});
        }
        return;
    }

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
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ BAŞARILI KAYIT').setDescription(`**${hedefUye.user.tag}** kayıt edildi!`).setColor('#2ecc71')] });
        }

        if (commandName === 'futbolcu-havuzu') {
            const sayfa = options.getInteger('sayfa') || 1;
            const oyuncular = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');
            const limit = 20;
            const maxSayfa = Math.ceil(oyuncular.length / limit) || 1;
            if (sayfa < 1 || sayfa > maxSayfa) return interaction.reply({ content: `❌ 1 ile ${maxSayfa} arası sayfa girin.`, flags: 64 });

            const baslangic = (sayfa - 1) * limit;
            const listeSlices = oyuncular.slice(baslangic, baslangic + limit);
            let liste = "";
            listeSlices.forEach((f, i) => {
                liste += `**${baslangic + i + 1}. ${f.name}** | ${f.mevki} | Değer: **${f.piyasaDegeri}M€**\n`;
            });

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`📋 TRANSFER HAVUZU (${sayfa}/${maxSayfa})`).setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'oto-ilk11') {
            await interaction.deferReply();
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            if (!kulup) return interaction.editReply({ content: '❌ Takım bulunamadı!' });

            const dizilisStr = options.getString('dizilis');
            const hedefButceMilyon = options.getInteger('butce');
            const hedefButceGercek = hedefButceMilyon * 1000000;

            if (kulup.butce < hedefButceGercek) {
                return interaction.editReply({ content: `❌ Kasan bu bütçeye yetmiyor! Kasan: **${(kulup.butce/1000000).toFixed(1)}M€**` });
            }

            const parcalar = dizilisStr.split('-').map(Number);
            if (parcalar.length !== 3 || parcalar[0] + parcalar[1] + parcalar[2] !== 10) {
                return interaction.editReply({ content: '❌ Hatalı diziliş! Örn: `4-3-3`' });
            }

            const defSayisi = parcalar[0], osSayisi = parcalar[1], sntSayisi = parcalar[2];
            const serbestler = Object.values(db.oyuncular).filter(o => o.takim === 'Serbest');

            if (serbestler.length < 11) {
                return interaction.editReply({ content: `❌ Yeterli serbest oyuncu yok!` });
            }

            const minHedefBonservis = hedefButceGercek * 0.95;
            const maxHedefBonservis = hedefButceGercek * 0.99;

            let enIyiSecimler = [];
            let enIyiMaliyet = 0;
            let enYakinFark = Infinity;

            const klListesi = serbestler.filter(o => o.mevki === 'KL');
            const dfListesi = serbestler.filter(o => o.mevki === 'DF' || o.mevki === 'STP');
            const osListesi = serbestler.filter(o => o.mevki === 'OS' || o.mevki === 'KANAT');
            const sntListesi = serbestler.filter(o => o.mevki === 'SNT');

            function rastgeleSec(arr) {
                return arr[Math.floor(Math.random() * arr.length)];
            }

            for (let deneme = 0; deneme < 1500; deneme++) {
                let secilenler = [];
                let toplamBonservis = 0;

                let secilenKl = rastgeleSec(klListesi.length > 0 ? klListesi : serbestler);
                secilenler.push(secilenKl);
                toplamBonservis += secilenKl.piyasaDegeri * 1000000;

                let basarili = true;
                const seciliset = new Set([secilenKl.id]);

                function oyuncuSec(liste) {
                    let havuz = liste.length > 0 ? liste : serbestler;
                    let filtrelenmis = havuz.filter(o => !seciliset.has(o.id));
                    if (filtrelenmis.length === 0) filtrelenmis = serbestler.filter(o => !seciliset.has(o.id));
                    if (filtrelenmis.length === 0) return null;
                    let o = rastgeleSec(filtrelenmis);
                    seciliset.add(o.id);
                    return o;
                }

                for (let i = 0; i < defSayisi; i++) {
                    let d = oyuncuSec(dfListesi);
                    if (!d) { basarili = false; break; }
                    secilenler.push(d);
                    toplamBonservis += d.piyasaDegeri * 1000000;
                }
                if (!basarili) continue;

                for (let i = 0; i < osSayisi; i++) {
                    let o = oyuncuSec(osListesi);
                    if (!o) { basarili = false; break; }
                    secilenler.push(o);
                    toplamBonservis += o.piyasaDegeri * 1000000;
                }
                if (!basarili) continue;

                for (let i = 0; i < sntSayisi; i++) {
                    let s = oyuncuSec(sntListesi);
                    if (!s) { basarili = false; break; }
                    secilenler.push(s);
                    toplamBonservis += s.piyasaDegeri * 1000000;
                }
                if (!basarili) continue;

                if (toplamBonservis <= hedefButceGercek) {
                    let fark = hedefButceGercek - toplamBonservis;
                    if (toplamBonservis >= minHedefBonservis && toplamBonservis <= maxHedefBonservis) {
                        enIyiSecimler = secilenler;
                        enIyiMaliyet = toplamBonservis;
                        break;
                    }
                    if (fark < enYakinFark) {
                        enYakinFark = fark;
                        enIyiSecimler = secilenler;
                        enIyiMaliyet = toplamBonservis;
                    }
                }
            }

            if (enIyiSecimler.length < 11) {
                return interaction.editReply({ content: `❌ Bu bütçeye uygun kadro dizilemedi. Lütfen bütçeyi biraz daha esnet!` });
            }

            if (!db.gecici11ler) db.gecici11ler = {};
            db.gecici11ler[user.id] = {
                takimIsmi: kulup.isim,
                oyuncuIdleri: enIyiSecimler.map(o => o.id),
                toplamMaliyet: enIyiMaliyet,
                dizilis: dizilisStr
            };
            veriyiKaydet();

            let listeAciklama = "";
            enIyiSecimler.forEach((oyuncu, index) => {
                listeAciklama += `**${index + 1}. ${oyuncu.name}** (${oyuncu.mevki}) - **${oyuncu.piyasaDegeri}M€**\n`;
            });

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`⚡ KADRO ÖNİZLEMESİ (${dizilisStr})`)
                    .setDescription(`Toplam Maliyet: **${(enIyiMaliyet/1000000).toFixed(1)}M€** (Hedef Bütçe: ${hedefButceMilyon}M€)\n\n${listeAciklama}\n\n👉 Onaylamak için: \`/11-onayla\``)
                    .setColor('#f1c40f')
                ]
            });
        }

        if (commandName === '11-onayla') {
            if (!db.gecici11ler || !db.gecici11ler[user.id]) {
                return interaction.reply({ content: '❌ Onay bekleyen kadro yok! Önce \`/oto-ilk11\` komutunu kullanmalısın.', flags: 64 });
            }
            const veri = db.gecici11ler[user.id];
            const kulup = Object.values(db.takimlar).find(t => t.isim === veri.takimIsmi);

            if (!kulup) {
                delete db.gecici11ler[user.id];
                veriyiKaydet();
                return interaction.reply({ content: '❌ Takımınız bulunamadı.', flags: 64 });
            }

            if (kulup.butce < veri.toplamMaliyet) {
                delete db.gecici11ler[user.id];
                veriyiKaydet();
                return interaction.reply({ content: '❌ Kulüp kasası bu kadro için yetersiz!', flags: 64 });
            }

            kulup.butce -= veri.toplamMaliyet;
            veri.oyuncuIdleri.forEach(id => {
                if (db.oyuncular[id]) {
                    db.oyuncular[id].takim = kulup.isim;
                }
            });
            delete db.gecici11ler[user.id];
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('✅ KADRO BAŞARIYLA KURULDU!').setDescription(`Oyuncular **${kulup.isim}** takımına katıldı. Kalan Kasa: **${(kulup.butce/1000000).toFixed(1)}M€**`).setColor('#2ecc71')] });
        }

        if (commandName === '11-reddet') {
            if (!db.gecici11ler || !db.gecici11ler[user.id]) {
                return interaction.reply({ content: '❌ Reddedilecek onay bekleyen kadro yok.', flags: 64 });
            }
            delete db.gecici11ler[user.id];
            veriyiKaydet();
            return interaction.reply({ content: '❌ Kadro teklifi reddedildi ve iptal edildi.', flags: 64 });
        }

        if (commandName === 'tahmin') {
            const secilenMac = options.getString('mac');
            const skor = options.getString('skor').trim();

            if (!db.aktifMaclar || !db.aktifMaclar[secilenMac.toLowerCase()]) {
                return interaction.reply({ content: '❌ Bu maç şu an oynanmıyor veya henüz başlamadı! Tahmin sadece maç başladıktan sonra yapılabilir.', flags: 64 });
            }

            if (!db.kullanilanTahminler) db.kullanilanTahminler = {};
            if (db.kullanilanTahminler[user.id]) {
                return interaction.reply({ content: '❌ Bu maç için tahmin hakkınızı zaten kullandınız! Her maç için yalnızca **1 kez** tahmin yapabilirsiniz.', flags: 64 });
            }

            if (!db.macTahminleri) db.macTahminleri = {};
            db.macTahminleri[user.id] = { mac: secilenMac, skor: skor };
            db.kullanilanTahminler[user.id] = true;
            veriyiKaydet();

            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🎯 TAHMİN ALINDI').setDescription(`Tahmininiz (**${skor}**) başarıyla kaydedildi. Maç sonunda doğru çıkarsa ödül kasanıza eklenecek!`).setColor('#3498db')] });
        }

        if (commandName === 'transfermarkt-kanal-ayarla') {
            db.transferKanalId = options.getChannel('kanal').id;
            veriyiKaydet();
            return interaction.reply({ content: '✅ Kanal ayarlandı!', flags: 64 });
        }

        if (commandName === 'serbest-birak') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            const oyuncuAdi = options.getString('futbolcu-adi').toLowerCase();
            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(oyuncuAdi) && o.takim === kulup.isim);
            if (!f) return interaction.reply({ content: '❌ Oyuncu bulunamadı!', flags: 64 });
            f.takim = 'Serbest';
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🚪 SERBEST BIRAKILDI').setDescription(`${f.name} serbest kaldı.`).setColor('#e74c3c')] });
        }

        if (commandName === 'transfer-teklif') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            const fAdi = options.getString('futbolcu-adi').toLowerCase();
            const bons = options.getInteger('bonservis');
            const maas = options.getInteger('haftalik-maas');
            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(fAdi));
            if (!f) return interaction.reply({ content: '❌ Oyuncu yok.', flags: 64 });

            if (!db.transferPazari) db.transferPazari = {};
            db.transferPazari[f.id] = { alanKulup: kulup.isim, bonservis: bons, gercekBonservis: bons*1000000, maas: maas };
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('📩 TEKLİF YAPILDI').setDescription(`${f.name} için ${bons}M€ teklif edildi. Onay için: \`/transfer-kabul\``).setColor('#3498db')] });
        }

        if (commandName === 'transfer-kabul') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            const fAdi = options.getString('futbolcu-adi').toLowerCase();
            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(fAdi));
            const teklif = db.transferPazari && db.transferPazari[f.id];
            const tutar = teklif ? teklif.gercekBonservis : f.piyasaDegeri * 1000000;

            if (kulup.butce < tutar) return interaction.reply({ content: '❌ Kasa yetersiz!', flags: 64 });

            kulup.butce -= tutar;
            f.takim = kulup.isim;
            if (teklif) f.maas = teklif.maas;
            delete db.transferPazari[f.id];
            veriyiKaydet();

            await transferDuyurusuGonder(guild, kulup.isim, f.name, tutar/1000000, f.maas);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🤝 TRANSFER BAŞARILI!').setColor('#2ecc71')] });
        }

        if (commandName === 'transfer-red') {
            const f = Object.values(db.oyuncular).find(o => o.name.toLowerCase().includes(options.getString('futbolcu-adi').toLowerCase()));
            if (f && db.transferPazari) delete db.transferPazari[f.id];
            veriyiKaydet();
            return interaction.reply({ content: '❌ Reddedildi.', flags: 64 });
        }

        if (commandName === 'kadrom') {
            const kulup = kullanicininTakiminiBulVeyaAta(user.id);
            const oyuncularim = Object.values(db.oyuncular).filter(f => f.takim === kulup.isim);
            if (oyuncularim.length === 0) return interaction.reply({ content: '❌ Kadroda futbolcu yok. \`/oto-ilk11\` komutu ile kadro kurabilirsin.', flags: 64 });

            let liste = "";
            let toplamMaas = 0;
            oyuncularim.forEach((f, i) => {
                toplamMaas += f.maas;
                liste += `**${i + 1}. ${f.name}** | ${f.mevki} | Gol: ${f.gol || 0} | Asist: ${f.asist || 0}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`🛡️ KADROM | ${kulup.isim}`).setDescription(liste).addFields({ name: '💸 Toplam Maaş', value: `€${toplamMaas.toLocaleString()}` }).setColor('#f1c40f')] });
        }

        if (commandName === 'takimlar') {
            let liste = "";
            Object.values(db.takimlar).forEach((t, i) => {
                liste += `**${i + 1}. ${t.isim}** | T.D: ${t.kurucu ? `<@${t.kurucu}>` : 'Boş'} | Kasa: €${t.butce.toLocaleString()}\n`;
            });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛡️ TAKIMLAR').setDescription(liste).setColor('#3498db')] });
        }

        if (commandName === 'takim-sec') {
            const takimAdiInput = options.getString('takim-adi').trim();
            const key = takimAdiInput.toLowerCase();
            if (!db.takimlar[key]) {
                db.takimlar[key] = {
                    isim: takimAdiInput,
                    kurucu: String(user.id),
                    puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0,
                    butce: 150000000, sonSponsor: 0
                };
            } else {
                db.takimlar[key].kurucu = String(user.id);
            }
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('👔 T.D. OLUNDU!').setDescription(`Artık **${db.takimlar[key].isim}** takımının Teknik Direktörüsün!`).setColor('#2ecc71')] });
        }

        if (commandName === 'mac-yap') {
            const ev = kullanicininTakiminiBulVeyaAta(user.id);
            const dep = db.takimlar[options.getString('rakip-takim').trim().toLowerCase()];
            if (!dep) return interaction.reply({ content: '❌ Rakip takım bulunamadı!', flags: 64 });

            db.kullanilanTahminler = {};
            veriyiKaydet();

            await interaction.reply({ content: `⚔️ **${ev.isim} vs ${dep.isim}** maçı başlıyor!` });
            await tekilCanliMacOyna(channel, ev.isim, dep.isim, guild);
            return;
        }

        if (commandName === '3-takimli-sezon') {
            const t1Isim = options.getString('takim1').trim();
            const td1Uye = options.getUser('td1');
            const t2Isim = options.getString('takim2').trim();
            const td2Uye = options.getUser('td2');
            const t3Isim = options.getString('takim3').trim();
            const td3Uye = options.getUser('td3');

            const takimlarVerisi = [
                { isim: t1Isim, td: td1Uye },
                { isim: t2Isim, td: td2Uye },
                { isim: t3Isim, td: td3Uye }
            ];

            takimlarVerisi.forEach(tv => {
                const k = tv.isim.toLowerCase();
                if (!db.takimlar[k]) {
                    db.takimlar[k] = {
                        isim: tv.isim,
                        kurucu: String(tv.td.id),
                        puan: 0, av: 0, o: 0, g: 0, b: 0, m: 0,
                        butce: 150000000, sonSponsor: 0
                    };
                } else {
                    db.takimlar[k].kurucu = String(tv.td.id);
                    db.takimlar[k].puan = 0;
                    db.takimlar[k].av = 0;
                    db.takimlar[k].o = 0;
                    db.takimlar[k].g = 0;
                    db.takimlar[k].b = 0;
                    db.takimlar[k].m = 0;
                }
            });
            veriyiKaydet();

            db.kullanilanTahminler = {};
            veriyiKaydet();

            await interaction.reply({ content: `🚀 **3 Takımlı Özel Sezon** başlatıldı! Toplam 10 maç arka arkaya oynanacak.` });
            await otomatikUcluSezonBaslat(channel, takimlarVerisi, guild);
            return;
        }

        if (commandName === 'mac-durdur') {
            if (db.otomatikSezonVerisi) {
                db.otomatikSezonVerisi.durduruldu = true;
            }
            db.aktifMaclar = {};
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🛑 MAÇLAR / SEZON DURDURULDU').setDescription('Devam eden tüm otomatik maçlar ve sezon durduruldu.').setColor('#e74c3c')] });
        }

        if (commandName === 'gol-kralligi') {
            const list = Object.values(db.oyuncular).filter(o => o.gol > 0).sort((a, b) => b.gol - a.gol).slice(0, 10);
            if (list.length === 0) return interaction.reply({ content: 'Gol atan oyuncu yok.', flags: 64 });
            let s = "";
            list.forEach((o, i) => { s += `**${i+1}. ${o.name}** (${o.takim}) - **${o.gol} Gol**\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('⚽ GOL KRALLIĞI').setDescription(s).setColor('#e67e22')] });
        }

        if (commandName === 'gol-sesi-kanal') {
            golKanalId = options.getChannel('kanal').id;
            return interaction.reply({ content: '✅ Ses kanalı ayarlandı.', flags: 64 });
        }

        if (commandName === 'sponsor') {
            const k = kullanicininTakiminiBulVeyaAta(user.id);
            const gelir = 4000000;
            k.butce += gelir;
            veriyiKaydet();
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('💼 SPONSOR').setDescription(`Kasaya €${gelir.toLocaleString()} eklendi.`).setColor('#f1c40f')] });
        }

        if (commandName === 'butce') {
            const k = kullanicininTakiminiBulVeyaAta(user.id);
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle(`💰 Bütçe`).setDescription(`Kasa: **€${k.butce.toLocaleString()}**`).setColor('#2ecc71')] });
        }

        if (commandName === 'butce-ver') {
            const t = db.takimlar[options.getString('takim-adi').trim().toLowerCase()];
            if (!t) return interaction.reply({ content: '❌ Takım bulunamadı!', flags: 64 });
            t.butce += options.getInteger('miktar') * 1000000;
            veriyiKaydet();
            return interaction.reply({ content: '✅ Bütçe eklendi.', flags: 64 });
        }

        if (commandName === 'puan-durumu') {
            let s = "";
            Object.values(db.takimlar).sort((a,b)=>b.puan-a.puan || b.av-a.av).forEach((t,i)=>{ s+=`**${i+1}. ${t.isim}** - Puan: ${t.puan} | Averaj: ${t.av} | O: ${t.o}\n`; });
            return interaction.reply({ embeds: [new EmbedBuilder().setTitle('🏆 PUAN DURUMU').setDescription(s).setColor('#3498db')] });
        }

        if (commandName === 'sezon-baslat') {
            db.sezonAktif = true;
            veriyiKaydet();
            return interaction.reply({ content: '🚀 Sezon başlatıldı.' });
        }

        if (commandName === 'sezon-durdur') {
            db.sezonAktif = false;
            veriyiKaydet();
            return interaction.reply({ content: '🛑 Durduruldu.', flags: 64 });
        }

        if (commandName === 'lig-sifirla') {
            Object.values(db.takimlar).forEach(t => { t.puan=0; t.av=0; t.o=0; t.g=0; t.b=0; t.m=0; });
            db.kullanilanTahminler = {};
            db.aktifMaclar = {};
            veriyiKaydet();
            return interaction.reply({ content: '🔄 Lig ve istatistikler sıfırlandı.', flags: 64 });
        }

    } catch (err) {
        console.error(err);
    }
});

client.login(process.env.DISCOD_TOKEN || process.env.DISCORD_TOKEN);
