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
// 1. WEB SUNUCUSU (7/24 Uptime Sağlayıcı)
// ==========================================
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Tendo League Mega Sistem 7/24 Aktif!');
}).listen(process.env.PORT || 3000, () => {
    console.log('🌐 Web sunucusu dinleniyor...');
});

// ==========================================
// 2. BOT İSTEMCİSİ VE BELLEK VERİTABANI
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates
    ]
});

const playerData = new Map();
const activeQuizzes = new Map();
const clubData = new Map();

// Varsayılan Takım Bilgileri
clubData.set('realmadrid', {
    name: 'Real Madrid',
    budget: 951.1,
    manager: 'Kenan Papi',
    squad: [
        { name: 'Tchouaméni', pos: 'DOS', val: 200 },
        { name: 'B.Šeško', pos: 'SNT', val: 109.5 },
        { name: 'Kenan Papi', pos: 'OS', val: 150 }
    ]
});

clubData.set('barcelona', {
    name: 'Barcelona',
    budget: 780.3,
    manager: 'Atanmadı',
    squad: [
        { name: 'D.Núñez', pos: 'SNT', val: 200 },
        { name: 'Joao Neves', pos: 'OS', val: 200 },
        { name: 'Hagi', pos: 'OOS', val: 150 }
    ]
});

function getPlayer(id, username) {
    if (!playerData.has(id)) {
        playerData.set(id, {
            name: username,
            team: 'Serbest',
            role: 'Kayıtsız',
            value: 20.0,
            antCount: 0,
            antCd: 0,
            penCd: 0
        });
    }
    return playerData.get(id);
}

client.on('ready', () => {
    console.log(`🤖 ${client.user.tag} Altyapı Botu Tam Kapasite Aktif!`);
});

// ==========================================
// 3. SUNUCUYA KATILANLARA OTOMATİK ROL
// ==========================================
client.on('guildMemberAdd', async (member) => {
    try {
        const unregRole = member.guild.roles.cache.find(r => r.name === 'Kayıtsız');
        if (unregRole) await member.roles.add(unregRole);
    } catch (e) {
        console.error('Otomatik rol verme hatası:', e);
    }
});

// ==========================================
// 4. MESAJ DİNLENİCİSİ VE LİG KOMUTLARI
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
            // Roller
            const unregRole = await message.guild.roles.create({ name: 'Kayıtsız', color: '#808080' });
            const playerRole = await message.guild.roles.create({ name: 'Futbolcu', color: '#1abc9c' });
            const tdRole = await message.guild.roles.create({ name: 'Teknik Direktör', color: '#e67e22' });
            const adminRole = await message.guild.roles.create({ name: 'Lig Yetkilisi', color: '#e74c3c' });

            // Kategoriler
            const catLeague = await message.guild.channels.create({ name: '🏆 TENDO LEAGUE 🏆', type: ChannelType.GuildCategory });
            const catMedia = await message.guild.channels.create({ name: '📢 DUYURU VE MEDYA', type: ChannelType.GuildCategory });

            // Tum Kanallar
            await message.guild.channels.create({ name: '📢・duyurular', type: ChannelType.GuildText, parent: catMedia.id });
            await message.guild.channels.create({ name: '🚀・booster', type: ChannelType.GuildText, parent: catMedia.id });
            await message.guild.channels.create({ name: '📚・sistemler', type: ChannelType.GuildText, parent: catMedia.id });
            await message.guild.channels.create({ name: '💬・sohbet', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🤖・bot-komut', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '📝・şikayet-öneri', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🎮・eğlence', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🔄・transfer-yapma-kanalı', type: ChannelType.GuildText, parent: catLeague.id });
            
            const chAntrenman = await message.guild.channels.create({
                name: '🏋️・antrenman',
                type: ChannelType.GuildText,
                parent: catLeague.id,
                rateLimitPerUser: 3600 // 1 Saatlik Yavaş Mod
            });

            await message.guild.channels.create({ name: '📅・takvim', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🌧️・hava-durumu', type: ChannelType.GuildText, parent: catLeague.id });
            
            const chKayit = await message.guild.channels.create({ 
                name: '📝・kayıt-şehri', 
                type: ChannelType.GuildText, 
                parent: catLeague.id 
            });

            // Kayit Paneli
            const regEmbed = new EmbedBuilder()
                .setTitle('📝 Tendo League Lisans Kayıt Paneli')
                .setColor('#2b2d31')
                .setDescription('Ligimize hoş geldiniz! Lisans çıkarmak için durumunuza uygun butona tıklayın.');

            const regRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg_player').setLabel('Futbolcu Kaydı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reg_td').setLabel('Teknik Direktör Kaydı').setStyle(ButtonStyle.Primary)
            );

            await chKayit.send({ embeds: [regEmbed], components: [regRow] });

            return statusMsg.edit(`✅ **Kurulum Tamamlandı!**\n\n• **Roller:** ${unregRole}, ${playerRole}, ${tdRole}, ${adminRole}\n• **Antrenman Kanalı:** ${chAntrenman} *(1 Saat Yavaş Mod)*\n• **Kayıt Kanalı:** ${chKayit}`);
        } catch (err) {
            console.error(err);
            return statusMsg.edit('❌ Kurulum sırasında yetki hatası oluştu!');
        }
    }

    // --- REHBER VE KOMUT LİSTESİ (.komutlar / .rehber) ---
    if (command === '.komutlar' || command === '.rehber' || command === '.yardim') {
        const embed = new EmbedBuilder()
            .setTitle('📖 TENDO LEAGUE BOT KOMUTLARI')
            .setColor('#2b2d31')
            .setDescription(
                '**⚙️ Sunucu Yöneticisi:**\n' +
                '• `.kur` : Otomatik kanalları, rolleri, kayıt butonlarını kurar.\n' +
                '• `.dver @kullanıcı <miktar> <sebep>` : Oyuncunun piyasa değerini artırır.\n' +
                '• `.basvurupanel` : Yetkili başvuru formunu kanala gönderir.\n\n' +
                '**⚽ Oyuncu Komutları:**\n' +
                '• `.ant` : Sadece **#🏋️・antrenman** kanalında çalışır (+3M€ ödül).\n' +
                '• `.pen` / `.kaleci` : Penaltı simülasyonu (+1.5M€ ödül).\n' +
                '• `.ftbilmece` : Futbol bilmecesi başlatır (+2M€ ödül).\n' +
                '• `.ara <isim>` : Sunucuda oyuncu araması yapar.\n\n' +
                '**🏟️ Maç ve Takım Komutları:**\n' +
                '• `!macsonu` : Maç sonu özet kartını ve istatistikleri açar.\n' +
                '• `!taktik` : İnteraktif taktik ve mentalite ayar paneli.\n' +
                '• `!kadro <takım>` : Takımın bütçe ve kadro listesi.'
            );
        return message.channel.send({ embeds: [embed] });
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
            return message.reply(`⏳ Bekleme süresindesin! **${rem} dk** sonra tekrar dene.`);
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
            .setDescription(`**${message.author.username}**, antrenman işlendi!\n\n${bar}\n\n• **İlerleme:** ${p.antCount}/10 Seans${rewardText}`);

        return message.channel.send({ embeds: [embed] });
    }

    // --- ÜYE ARAMA (.ara <isim>) ---
    if (command === '.ara') {
        const query = args.slice(1).join(' ').toLowerCase();
        if (!query) return message.reply('❌ Lütfen aranacak bir isim girin!');

        const members = await message.guild.members.fetch();
        const matched = members.filter(m => m.displayName.toLowerCase().includes(query) || m.user.username.toLowerCase().includes(query));

        const embed = new EmbedBuilder()
            .setTitle('🔍 Üye Arama Sistemi')
            .setColor('#2b2d31')
            .setDescription(`Aranan: **${query}** | Bulunan: **${matched.size}**\n\n` +
                (matched.map(m => `🟢 **${m.displayName}** (<@${m.id}>)`).join('\n') || 'Kullanıcı bulunamadı.'));

        return message.channel.send({ embeds: [embed] });
    }

    // --- PENALTI SİSTEMİ (.pen) ---
    if (command === '.pen' || command === '.kaleci') {
        const p = getPlayer(message.author.id, message.author.username);
        const now = Date.now();

        if (now < p.penCd) {
            const rem = Math.ceil((p.penCd - now) / 60000);
            return message.reply(`⏳ Bekleme süresindesin! **${rem} dk** sonra dene.`);
        }

        p.penCd = now + (2 * 60 * 60 * 1000);
        const isGoal = Math.random() < 0.5;

        if (isGoal) {
            p.value += 1.5;
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('⚽ GOOOOOOLLLL!').setColor('#43b581').setDescription(`Top ağlarla buluştu!\n🚀 **Kazanılan Değer:** +1.5M€\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
        } else {
            return message.channel.send({ embeds: [new EmbedBuilder().setTitle('🧤 KALECİ KURTARDI!').setColor('#f04747').setDescription(`Top kalecide kaldı!\n💰 **Güncel Değer:** ${p.value.toFixed(1)}M€`)] });
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

    // --- YETKİLİ DEĞER VERME (.dver) ---
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
            .setDescription(`💰 **Bütçe:** ${club.budget}M€\n👔 **Menajer:** ${club.manager}\n----------------------------------------\n${list}`);

        return message.channel.send({ embeds: [embed] });
    }

    // --- YETKİLİ BAŞVURU PANELİ (.basvurupanel) ---
    if (command === '.basvurupanel') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;

        const embed = new EmbedBuilder()
            .setTitle('📋 Yetkili Başvuru Formu')
            .setColor('#2b2d31')
            .setDescription('Ekibimize katılmak için aşağıdaki **Başvur** butonuna tıklayın.');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('btn_basvur').setLabel('📝 Başvur').setStyle(ButtonStyle.Primary)
        );

        return message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ==========================================
// 5. ETKİLEŞİM VE BUTON HANDLERİ
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            const member = interaction.member;
            const unregRole = interaction.guild.roles.cache.find(r => r.name === 'Kayıtsız');
            const playerRole = interaction.guild.roles.cache.find(r => r.name === 'Futbolcu');
            const tdRole = interaction.guild.roles.cache.find(r => r.name === 'Teknik Direktör');

            if (interaction.customId === 'btn_reg_player') {
                if (unregRole && member.roles.cache.has(unregRole.id)) await member.roles.remove(unregRole);
                if (playerRole) await member.roles.add(playerRole);
                return await interaction.reply({ content: '✅ **Kayıtsız** rolü kaldırıldı! **Futbolcu** lisansı tanımlandı.', ephemeral: true });
            }

            if (interaction.customId === 'btn_reg_td') {
                if (unregRole && member.roles.cache.has(unregRole.id)) await member.roles.remove(unregRole);
                if (tdRole) await member.roles.add(tdRole);
                return await interaction.reply({ content: '✅ **Kayıtsız** rolü kaldırıldı! **Teknik Direktör** lisansı tanımlandı.', ephemeral: true });
            }

            if (interaction.customId === 'btn_mentalite') return await interaction.reply({ content: '🎯 Mentalite: **Ofansif**', ephemeral: true });
            if (interaction.customId === 'btn_pres') return await interaction.reply({ content: '🏃 Pres: **Yüksek Pres**', ephemeral: true });
            if (interaction.customId === 'btn_tempo') return await interaction.reply({ content: '⚡ Tempo: **Kısa Pas**', ephemeral: true });
            if (interaction.customId === 'btn_bitir') return await interaction.reply({ content: '✅ Taktik ayarları kaydedildi!', ephemeral: true });

            if (interaction.customId === 'btn_basvur') {
                const modal = new ModalBuilder().setCustomId('modal_basvuru').setTitle('Yetkili Başvuru Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_age').setLabel('Yaşınız?').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_reason').setLabel('Neden Yetkili Olmak İstiyorsunuz?').setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
                return await interaction.showModal(modal);
            }
        }

        if (interaction.type === InteractionType.ModalSubmit && interaction.customId === 'modal_basvuru') {
            const age = interaction.fields.getTextInputValue('input_age');
            const reason = interaction.fields.getTextInputValue('input_reason');

            const embed = new EmbedBuilder()
                .setTitle('📋 Yeni Yetkili Başvurusu')
                .setColor('#2b2d31')
                .setDescription(`**Başvuran:** <@${interaction.user.id}>\n**Yaş:** ${age}\n**Açıklama:** ${reason}`);

            await interaction.reply({ content: '✅ Başvurunuz başarıyla iletildi.', ephemeral: true });
            return interaction.channel.send({ embeds: [embed] });
        }
    } catch (err) {
        console.error('Etkileşim Hatası:', err);
    }
});

client.login(process.env.TOKEN);
