const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    InteractionType, 
    PermissionFlagsBits, 
    ChannelType 
} = require('discord.js');
const http = require('http');
require('dotenv').config();

// ==========================================
// 1. WEB SUNUCUSU (Render / Glitch 7/24 Uptime)
// ==========================================
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Tendo League Full Sistem 7/24 Aktif!');
}).listen(process.env.PORT || 3000);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Veri Yapıları
const playerData = new Map();
const activeQuizzes = new Map();
const clubData = new Map();

// Varsayılan Takım Bilgileri ve Kadrolar
clubData.set('realmadrid', {
    name: 'Real Madrid',
    budget: 951.1,
    squad: [
        { name: 'Tchouaméni', pos: 'DOS', val: 200 },
        { name: 'B.Šeško', pos: 'SNT', val: 109.5 }
    ]
});

clubData.set('barcelona', {
    name: 'Barcelona',
    budget: 780.3,
    squad: [
        { name: 'D.Núñez', pos: 'SNT', val: 200 },
        { name: 'Joao Neves', pos: 'OS', val: 200 },
        { name: 'Hagi', pos: 'OOS', val: 150 }
    ]
});

function getPlayer(id, username) {
    if (!playerData.has(id)) {
        playerData.set(id, { name: username, team: 'Serbest', role: 'Kayıtsız', value: 20.0, antCount: 0, antCd: 0, penCd: 0 });
    }
    return playerData.get(id);
}

client.on('ready', () => {
    console.log(`🤖 Tendo League Botu (${client.user.tag}) Tam Kapasite Aktif!`);
});

// ==========================================
// 2. OTOMATİK ROL VE KAYIT SİSTEMİ
// ==========================================
client.on('guildMemberAdd', async (member) => {
    // Yeni Girenlere Otomatik Kayıtsız Rolü Ver
    const unregRole = member.guild.roles.cache.find(r => r.name === 'Kayıtsız');
    if (unregRole) await member.roles.add(unregRole);
});

// ==========================================
// 3. MESAJ VE LİG KOMUTLARI
// ==========================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    // --- OTOMATİK KURULUM KOMUTU (.kur) ---
    if (command === '.kur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece Yöneticiler kullanabilir!');
        }

        const statusMsg = await message.channel.send('⏳ **Tendo League Kurulumu Başlatılıyor...**');

        try {
            // Roller Oluşturuluyor
            const unregRole = await message.guild.roles.create({ name: 'Kayıtsız', color: '#808080' });
            const playerRole = await message.guild.roles.create({ name: 'Futbolcu', color: '#1abc9c' });
            const tdRole = await message.guild.roles.create({ name: 'Teknik Direktör', color: '#e67e22' });

            // Kategori ve Kanallar Oluşturuluyor
            const category = await message.guild.channels.create({ name: '🏆 TENDO LEAGUE 🏆', type: ChannelType.GuildCategory });

            const antCh = await message.guild.channels.create({
                name: '🏋️・antrenman',
                type: ChannelType.GuildText,
                parent: category.id,
                rateLimitPerUser: 3600 // 1 Saatlik Yavaş Mod
            });

            const matchCh = await message.guild.channels.create({
                name: '🏟️・maç-sahası',
                type: ChannelType.GuildText,
                parent: category.id
            });

            const regCh = await message.guild.channels.create({
                name: '📝・kayıt-şehri',
                type: ChannelType.GuildText,
                parent: category.id
            });

            // Kayıt Paneli Butonları
            const regEmbed = new EmbedBuilder()
                .setTitle('📝 Tendo League Lisans Kayıt Paneli')
                .setColor('#2b2d31')
                .setDescription('Ligimize hoş geldiniz! Lisans çıkarmak için aşağıdaki butonlardan kaydolmak istediğiniz rolü seçin.');

            const regRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg_player').setLabel('Futbolcu Kaydı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reg_td').setLabel('Teknik Direktör Kaydı').setStyle(ButtonStyle.Primary)
            );

            await regCh.send({ embeds: [regEmbed], components: [regRow] });

            return statusMsg.edit(`✅ **Lig Altyapısı Başarıyla Kuruldu!**\n\n• **Roller:** ${unregRole}, ${playerRole}, ${tdRole}\n• **Antrenman Kanalı:** ${antCh} *(1 Saat Yavaş Mod Aktif)*\n• **Kayıt Kanalı:** ${regCh}`);
        } catch (err) {
            console.error(err);
            return statusMsg.edit('❌ Kurulum sırasında bir hata oluştu!');
        }
    }

    // --- ANTRENMAN KOMUTU (.ant) ---
    if (command === '.ant' || command === '.antrenman') {
        if (!message.channel.name.includes('antrenman')) {
            return message.reply('❌ Antrenman komutu sadece **#🏋️・antrenman** kanalında kullanılabilir!');
        }

        const p = getPlayer(message.author.id, message.author.username);
        const now = Date.now();

        if (now < p.antCd) {
            const rem = Math.ceil((p.antCd - now) / 60000);
            return message.reply(`⏳ Bekleme süresindesin! **${rem} dk** sonra dene.`);
        }

        p.antCount = (p.antCount % 10) + 1;
        p.antCd = now + 3600000;

        let rewardText = '';
        if (p.antCount === 10) {
            p.value += 3.0;
            rewardText = '\n\n🎉 **TEBRİKLER!** 10 seans bitti: **+3M€** kazandın!';
        }

        const bar = '🟩'.repeat(Math.min(p.antCount, 5)) + '⬜'.repeat(Math.max(0, 5 - p.antCount));

        const embed = new EmbedBuilder()
            .setTitle('⚽ ANTRENMAN TAKİBİ')
            .setThumbnail(message.author.displayAvatarURL())
            .setColor('#43b581')
            .setDescription(`**${message.author.username}**, antrenman sisteme işlendi!\n\n${bar}\n\n• **İlerleme:** ${p.antCount}/10 Seans${rewardText}`)
            .setFooter({ text: 'Tendo Performance Center' });

        return message.channel.send({ embeds: [embed] });
    }

    // --- ÜYE ARAMA (.ara <isim>) ---
    if (command === '.ara') {
        const query = args.slice(1).join(' ').toLowerCase();
        if (!query) return message.reply('❌ Lütfen bir isim girin!');

        const members = await message.guild.members.fetch();
        const matched = members.filter(m => m.displayName.toLowerCase().includes(query) || m.user.username.toLowerCase().includes(query));

        const embed = new EmbedBuilder()
            .setTitle('🔍 Üye Arama Sistemi')
            .setColor('#2b2d31')
            .setDescription(`Aranan: **${query}**\nBulunan: **${matched.size}**\n\n` +
                (matched.map(m => `🟢 **${m.displayName}** (<@${m.id}>)`).join('\n') || 'Üye bulunamadı.'))
            .setFooter({ text: 'Tendo League Kayıt Sistemi' });

        return message.channel.send({ embeds: [embed] });
    }

    // --- PENALTI SİSTEMİ (.pen / .kaleci) ---
    if (command === '.pen' || command === '.kaleci') {
        const p = getPlayer(message.author.id, message.author.username);
        const now = Date.now();

        if (now < p.penCd) {
            const rem = Math.ceil((p.penCd - now) / 60000);
            return message.reply(`⏳ Penaltı sahası dolu! **${rem} dk** bekle.`);
        }

        p.penCd = now + (2 * 60 * 60 * 1000);
        const isGoal = Math.random() < 0.5;

        if (command === '.pen') {
            if (isGoal) {
                p.value += 1.5;
                return message.channel.send({ embeds: [new EmbedBuilder().setTitle('⚽ GOOOOOOLLLL!').setColor('#43b581').setDescription(`Harika bir vuruş!\n🚀 **Kazanılan Değer:** +1.5M€\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
            } else {
                return message.channel.send({ embeds: [new EmbedBuilder().setTitle('🧤 KALECİ KURTARDI!').setColor('#f04747').setDescription(`Kaleci çıkardı!\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
            }
        }
    }

    // --- FUTBOL BİLMECESİ (.ftbilmece) ---
    if (command === '.ftbilmece') {
        const questions = [
            { q: 'AC Milan\'ın 3 numaralı forması emekli edilen efsane stoper kimdir?', a: 'maldini' },
            { q: 'Tottenham\'dan Bayern Münih\'e transfer olan İngiliz santrfor kimdir?', a: 'harry kane' }
        ];

        const selected = questions[Math.floor(Math.random() * questions.length)];
        activeQuizzes.set(message.channel.id, { answer: selected.a });

        const embed = new EmbedBuilder()
            .setTitle('⚽ Futbol Bilmecesi')
            .setColor('#2b2d31')
            .addFields({ name: 'Soru:', value: selected.q }, { name: '⏰ Süre:', value: '30 Saniye' });

        return message.channel.send({ embeds: [embed] });
    }

    if (activeQuizzes.has(message.channel.id)) {
        const quiz = activeQuizzes.get(message.channel.id);
        if (message.content.toLowerCase().trim() === quiz.answer) {
            activeQuizzes.delete(message.channel.id);
            const p = getPlayer(message.author.id, message.author.username);
            p.value += 2.0;

            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('🎉 TEBRİKLER!').setColor('#43b581').setDescription(`Tebrikler <@${message.author.id}>, doğru cevap!\n✅ **Cevap:** ${quiz.answer.toUpperCase()}\n💰 **Ödül:** +2.0M€ Değer`)] });
        }
    }

    // --- YETKİLİ DEĞER VERME (.dver @üye <miktar> <sebep>) ---
    if (command === '.dver') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Bir üye etiketle.');

        const amount = parseFloat(args[2]);
        const reason = args.slice(3).join(' ') || 'Lig Yetkili Kararı';

        if (isNaN(amount)) return message.reply('❌ Geçerli bir miktar gir.');

        const p = getPlayer(target.id, target.displayName);
        p.value += amount;

        return message.channel.send({ embeds: [new EmbedBuilder().setColor('#43b581').setDescription(`✅ **${target.displayName}** üyesine **${reason}** sebebiyle **+${amount}M€** eklendi!\nGüncel Değer: **${p.value.toFixed(1)}M€**`)] });
    }

    // --- MAÇ SONU ÖZETİ (!macsonu) ---
    if (command === '!macsonu') {
        const embed = new EmbedBuilder()
            .setTitle('🏟️ MAÇ SONA ERDİ')
            .setColor('#2b2d31')
            .setDescription(
                '⚽ **Real Madrid  1 - 4  Barcelona** 🏆\n' +
                '🏆 **Barcelona** kazandı!\n----------------------------------------\n' +
                '11\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€\n' +
                '36\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€ ⬅️ 🅰️ **Joao Neves** | 🇵🇹 | OS | 200M€\n' +
                '51\' ⚽ **D.Núñez** | 🇺🇾 | SNT | 200M€\n' +
                '74\' ⚽ **Tchouaméni** | 🇫🇷 | DOS | 200M€\n' +
                '89\' ⚽ **B.Šeško** | 🇸🇮 | SNT | 109.5M€ ⬅️ 🅰️ **Hagi** | 🇷🇴 | OOS | 150M€\n----------------------------------------\n\n' +
                '📊 **Maç İstatistikleri**\n' +
                '⚡ **Topla Oynama %**\n🟦🟦🟦🟦🟦🟦🟥🟥🟥🟥🟥 (53 - 47)\n\n' +
                '💥 **Şut:** 6 - 11 | 🎯 **İsabetli:** 4 - 5 | 🚩 **Korner:** 1 - 6\n\n' +
                '🎯 **Taktik Etkisi**\n' +
                '⚔️ Ofansif • 🔺 Yüksek Pres vs 🧱 Ultra Defansif • Orta Blok\n\n' +
                '⭐ **MAÇIN ADAMI**\n' +
                '🌟 **D.Núñez** | 🇺🇾 | SNT | 200M€ — **10.0**\n' +
                '⚽ 3 gol • 💥 9 şut • 🌀 3 çalım • 🛡️ 3 top kapma'
            )
            .setFooter({ text: 'Real Madrid 951.1M • Barcelona 780.3M' });

        return message.channel.send({ embeds: [embed] });
    }

    // --- TAKTİK PANENLİ (!taktik) ---
    if (command === '!taktik') {
        const embed = new EmbedBuilder()
            .setTitle('🎯 TAKTİK - Real Madrid')
            .setColor('#2b2d31')
            .setDescription('🎯 **Mentalite:** ⚔️ Ofansif\n🏃 **Pres:** 🔺 Yüksek Pres\n⚡ **Tempo:** 📐 Kısa Pas');

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_mentalite').setLabel('Ofansif').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_pres').setLabel('Yüksek Pres').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('btn_tempo').setLabel('Kısa Pas').setStyle(ButtonStyle.Secondary)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_kadro').setLabel('Kadroya Dön').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('btn_bitir').setLabel('Kaydet & Bitir').setStyle(ButtonStyle.Success)
        );

        return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // --- KADRO DÖKÜMÜ (!kadro <takım>) ---
    if (command === '!kadro') {
        const key = args[1] ? args[1].toLowerCase() : 'realmadrid';
        const club = clubData.get(key);

        if (!club) return message.reply('❌ Kulüp bulunamadı!');

        const list = club.squad.map(s => `🟢 **${s.name}** | ${s.pos} | ${s.val}M€`).join('\n');
        const embed = new EmbedBuilder()
            .setTitle(`📋 ${club.name} Kadrosu`)
            .setColor('#2b2d31')
            .setDescription(`💰 **Bütçe:** ${club.budget}M€\n----------------------------------------\n${list}`);

        return message.channel.send({ embeds: [embed] });
    }

    // --- REHBER (.rehber) ---
    if (command === '.rehber') {
        const embed = new EmbedBuilder()
            .setTitle('📖 Tendo League Sistem Rehberi')
            .setColor('#2b2d31')
            .setDescription(
                '• `.kur` : Otomatik kanalları, rolleri ve kayıt panellerini açar.\n' +
                '• `.ant` : Sadece antrenman kanalında çalışır (1 saatlik yavaş modlu).\n' +
                '• `.pen` : Penaltı atışı simülasyonu.\n' +
                '• `.ftbilmece` : Futbol soru-cevap oyunu.\n' +
                '• `.dver` : Yetkili oyuncu değer güncelleme.\n' +
                '• `!macsonu` : Detaylı maç sonu ve istatistik özeti.\n' +
                '• `!taktik` : Taktik ve strateji yönetimi.\n' +
                '• `!kadro <takım>` : Takım oyuncu listesi.'
            );
        return message.channel.send({ embeds: [embed] });
    }
});

// ==========================================
// 4. BUTON VE ETKİLEŞİM YÖNETİCİSİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            const member = interaction.member;
            const unregRole = interaction.guild.roles.cache.find(r => r.name === 'Kayıtsız');
            const playerRole = interaction.guild.roles.cache.find(r => r.name === 'Futbolcu');
            const tdRole = interaction.guild.roles.cache.find(r => r.name === 'Teknik Direktör');

            // Kayıt İşlemleri
            if (interaction.customId === 'btn_reg_player') {
                if (unregRole && member.roles.cache.has(unregRole.id)) await member.roles.remove(unregRole);
                if (playerRole) await member.roles.add(playerRole);
                return await interaction.reply({ content: '✅ Kayıtsız rolünüz alındı! **Futbolcu** rolü verildi.', ephemeral: true });
            }

            if (interaction.customId === 'btn_reg_td') {
                if (unregRole && member.roles.cache.has(unregRole.id)) await member.roles.remove(unregRole);
                if (tdRole) await member.roles.add(tdRole);
                return await interaction.reply({ content: '✅ Kayıtsız rolünüz alındı! **Teknik Direktör** rolü verildi.', ephemeral: true });
            }

            // Taktik Buton Yanıtları
            if (interaction.customId === 'btn_mentalite') return await interaction.reply({ content: '🎯 Mentalite: **Ofansif**', ephemeral: true });
            if (interaction.customId === 'btn_pres') return await interaction.reply({ content: '🏃 Pres: **Yüksek Pres**', ephemeral: true });
            if (interaction.customId === 'btn_tempo') return await interaction.reply({ content: '⚡ Tempo: **Kısa Pas**', ephemeral: true });
            if (interaction.customId === 'btn_bitir') return await interaction.reply({ content: '✅ Taktik ayarları kaydedildi!', ephemeral: true });
        }
    } catch (err) {
        console.error('Etkileşim hatası:', err);
    }
});

client.login(process.env.TOKEN);
