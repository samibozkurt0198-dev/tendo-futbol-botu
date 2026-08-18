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
// RENDER İÇİN UPTIME / PORT SUNUCUSU (10000)
// ==========================================
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Freeze League Pro Altyapı Aktif!');
}).listen(PORT, () => {
    console.log(`🌐 Web sunucusu ${PORT} portunda başarıyla dinleniyor.`);
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

// Veri Hafızası
const playerData = new Map();
const clubData = new Map();

// 6 Takımın İlk Kurulum Verileri
function initClubs() {
    const clubs = [
        { id: 'rmadrid', name: 'Real Madrid', manager: null, roleName: 'Real Madrid' },
        { id: 'barca', name: 'Barcelona', manager: null, roleName: 'Barcelona' },
        { id: 'arsenal', name: 'Arsenal', manager: null, roleName: 'Arsenal' },
        { id: 'chelsea', name: 'Chelsea', manager: null, roleName: 'Chelsea' },
        { id: 'mcity', name: 'Manchester City', manager: null, roleName: 'Manchester City' },
        { id: 'psg', name: 'Paris Saint-Germain', manager: null, roleName: 'PSG' }
    ];

    clubs.forEach(c => {
        clubData.set(c.id, {
            ...c,
            budget: 800.0,
            tactic: '4-2-4',
            mentality: '⚔️ Ofansif',
            pres: '🔺 Yüksek Pres',
            tempo: '📐 Kısa Pas',
            squad: [
                { pos: 'KL', name: 'M.Safonov', val: 144, isNpc: false, id: '1538693704229978233' },
                { pos: 'SLB', name: 'Jafarguliye', val: 108, isNpc: false, id: '1463138269092118682' },
                { pos: 'STP', name: 'V. De Ven', val: 32, isNpc: false, id: '1268465609382039562' },
                { pos: 'STP', name: 'Maldini', val: 18.5, isNpc: false, id: '1398949150355095574' },
                { pos: 'SGB', name: 'Z. Çelik', val: 53, isNpc: false, id: '849292779078549515' },
                { pos: 'OS', name: 'Hagi', val: 150, isNpc: false, id: '932208724024623125' },
                { pos: 'OS', name: 'B.Fernande', val: 65.6, isNpc: false, id: '1532801129719795739' },
                { pos: 'SLK', name: 'B.Barcola', val: 28, isNpc: false, id: '1358384988005073087' },
                { pos: 'FRV', name: 'R. Falcao', val: 200, isNpc: false, id: '887994726953922621' },
                { pos: 'FRV', name: 'B.Šeško', val: 112.6, isNpc: false, id: '1126000000000000000' },
                { pos: 'SGK', name: 'A.Güler', val: 47, isNpc: false, id: '1421904209204482121' }
            ]
        });
    });
}
initClubs();

function getPlayer(id, username) {
    if (!playerData.has(id)) {
        playerData.set(id, { name: username, team: 'Serbest', role: 'Kayıtsız', value: 20.0, antCount: 0, antCd: 0, penCd: 0 });
    }
    return playerData.get(id);
}

// Boş Takımlar Kanalını Otomatik Güncelleyen Fonksiyon
async function updateFreeTeamsChannel(guild) {
    const ch = guild.channels.cache.find(c => c.name.includes('boş-takımlar'));
    if (!ch) return;

    let text = '🏆 **LİG TAKIM DURUMLARI (BOŞ / DOLU TAKIMLAR)**\n----------------------------------------\n';
    clubData.forEach(club => {
        const status = club.manager ? `🔴 **DOLU** (T.D: <@${club.manager}>)` : '🟢 **BOŞ** (Menajer Aranıyor)';
        text += `• **${club.name}**: ${status}\n`;
    });
    text += '\n*Teknik Direktör olmak için kayıt kanalından başvuru yapabilirsiniz.*';

    const messages = await ch.messages.fetch({ limit: 5 });
    const lastMsg = messages.first();
    if (lastMsg && lastMsg.author.id === client.user.id) {
        await lastMsg.edit(text);
    } else {
        await ch.send(text);
    }
}

client.on('ready', () => {
    console.log(`🤖 ${client.user.tag} Görsel Uyumlu Lig Botu Başarıyla Giriş Yaptı ve Aktif!`);
});

// Otomatik Kayıtsız Rolü
client.on('guildMemberAdd', async (member) => {
    try {
        const unregRole = member.guild.roles.cache.find(r => r.name === 'Kayıtsız');
        if (unregRole) await member.roles.add(unregRole);
    } catch (e) {
        console.error(e);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.trim().split(/ +/);
    const command = args[0].toLowerCase();

    // ==========================================
    // 1. TAM OTOMATİK GELİŞMİŞ KURULUM (.kur)
    // ==========================================
    if (command === '.kur') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Yöneticiler** kullanabilir!');
        }

        const statusMsg = await message.channel.send('⏳ **Eski tüm kanallar siliniyor, roller ve kanal izinleri yapılandırılıyor...**');

        try {
            // A) Tüm Eski Kanalları Sil
            const channels = await message.guild.channels.fetch();
            for (const [id, ch] of channels) {
                if (ch && ch.deletable && ch.id !== message.channel.id) {
                    await ch.delete().catch(() => {});
                }
            }

            // B) Rolleri Oluştur
            const unregRole = await message.guild.roles.create({ name: 'Kayıtsız', color: '#808080' });
            const playerRole = await message.guild.roles.create({ name: 'Futbolcu', color: '#1abc9c' });
            const tdRole = await message.guild.roles.create({ name: 'Teknik Direktör', color: '#e67e22' });
            const regAuthRole = await message.guild.roles.create({ name: 'Kayıt Yetkilisi', color: '#3498db' });
            const valAuthRole = await message.guild.roles.create({ name: 'Değer Yetkilisi', color: '#f1c40f' });

            // Takım Rolleri
            for (const club of clubData.values()) {
                await message.guild.roles.create({ name: club.roleName, color: '#9b59b6' });
            }

            // C) İzin Tanımları (Kayıtsızlar diğer kanalları göremeyecek)
            const denyUnregistered = [
                { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: unregRole.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: playerRole.id, allow: [PermissionFlagsBits.ViewChannel] },
                { id: tdRole.id, allow: [PermissionFlagsBits.ViewChannel] }
            ];

            const allowOnlyUnregistered = [
                { id: message.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: unregRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                { id: regAuthRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ];

            // D) Kategoriler ve Bol Kanallar
            const catInfo = await message.guild.channels.create({ name: '📢 İDARİ VE DUYURULAR', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '📢・duyurular', type: ChannelType.GuildText, parent: catInfo.id });
            await message.guild.channels.create({ name: '📜・şartlar-ve-kurallar', type: ChannelType.GuildText, parent: catInfo.id });
            const chBosTakimlar = await message.guild.channels.create({ name: '📋・boş-takımlar', type: ChannelType.GuildText, parent: catInfo.id });

            const catReg = await message.guild.channels.create({ name: '📝 KAYIT MERKEZİ', type: ChannelType.GuildCategory });
            const chKayit = await message.guild.channels.create({ name: '📝・kayıt-ol', type: ChannelType.GuildText, parent: catReg.id, permissionOverwrites: allowOnlyUnregistered });
            await message.guild.channels.create({ name: '📋・kayıt-log', type: ChannelType.GuildText, parent: catReg.id, permissionOverwrites: denyUnregistered });

            const catLeague = await message.guild.channels.create({ name: '🏆 SAHA VE DİZİLİŞ', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '📋・taktikler', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '📖・maç-sonucu', type: ChannelType.GuildText, parent: catLeague.id });
            await message.guild.channels.create({ name: '🏋️・antrenman', type: ChannelType.GuildText, parent: catLeague.id, rateLimitPerUser: 3600 });
            await message.guild.channels.create({ name: '⚽・penaltı-sahası', type: ChannelType.GuildText, parent: catLeague.id });

            const catTeams = await message.guild.channels.create({ name: '🏟️ TAKIM KANALLARI', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            for (const club of clubData.values()) {
                await message.guild.channels.create({ name: `🛡️・${club.id}-soyunma-odası`, type: ChannelType.GuildText, parent: catTeams.id });
            }

            const catTransfer = await message.guild.channels.create({ name: '🔄 TRANSFER BORSASI', type: ChannelType.GuildCategory, permissionOverwrites: denyUnregistered });
            await message.guild.channels.create({ name: '🔄・transfer-yapma', type: ChannelType.GuildText, parent: catTransfer.id });
            await message.guild.channels.create({ name: '💰・oyuncu-piyasası', type: ChannelType.GuildText, parent: catTransfer.id });

            // E) Görsel Uyumlu Kayıt Paneli Gönderme
            const regEmbed = new EmbedBuilder()
                .setTitle('Freeze League Hoş Geldiniz!')
                .setColor('#2b2d31')
                .setDescription(
                    'Sunucumuza yeni bir üye giriş yaptı. Kayıt işlemleri için yetkililerin işleme başlaması bekleniyor.\n\n' +
                    '**Kayıt Şartları:**\n' +
                    '• `#📋・şartlar-ve-kurallar` kanalını okumanız zorunludur.\n' +
                    '• Formu doldurduktan sonra yetkililer kaydınızı onaylayacaktır.'
                );

            const regRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('btn_reg_player').setLabel('Futbolcu Kaydı').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId('btn_reg_td').setLabel('Teknik Direktör Kaydı').setStyle(ButtonStyle.Primary)
            );

            await chKayit.send({ embeds: [regEmbed], components: [regRow] });

            // Boş Takımlar Kanalını Doldur
            await updateFreeTeamsChannel(message.guild);

            return statusMsg.edit(`✅ **Freeze League Dev Altyapısı Kuruldu!**\n\n• **Boş Takımlar:** ${chBosTakimlar}\n• **Kayıt Kanalı:** ${chKayit}\n• Tüm takım kanalları ve rol izinleri başarıyla entegre edildi.`);
        } catch (e) {
            console.error(e);
            return statusMsg.edit('❌ Kurulum sırasında hata oluştu.');
        }
    }

    // ==========================================
    // 2. DEĞER VERME VE ALMA (.dver / .dal)
    // ==========================================
    if (command === '.dver' || command === '.dal') {
        if (!message.member.roles.cache.some(r => r.name === 'Değer Yetkilisi') && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bu komutu sadece **Değer Yetkilisi** rolüne sahip kişiler kullanabilir!');
        }

        const target = message.mentions.members.first();
        if (!target) return message.reply('❌ Bir üye etiketlemelisiniz!');

        let amount = parseFloat(args[2]);
        if (isNaN(amount)) return message.reply('❌ Geçerli bir miktar girin!');

        if (command === '.dal') amount = -Math.abs(amount);

        const p = getPlayer(target.id, target.displayName);
        p.value += amount;
        if (p.value < 0) p.value = 0;

        const actionText = command === '.dver' ? 'eklendi' : 'düşürüldü';
        const embed = new EmbedBuilder()
            .setColor(command === '.dver' ? '#43b581' : '#f04747')
            .setDescription(`💰 **${target.displayName}** oyuncusunun değeri **${Math.abs(amount)}M€** ${actionText}!\nGüncel Değeri: **${p.value.toFixed(1)}M€**`);

        return message.channel.send({ embeds: [embed] });
    }

    // ==========================================
    // 3. GELİŞMİŞ TAKTİK VE KADRO (!taktik <takim_id>)
    // ==========================================
    if (command === '!taktik') {
        const clubId = args[1] ? args[1].toLowerCase() : 'rmadrid';
        const club = clubData.get(clubId);

        if (!club) return message.reply('❌ Takım bulunamadı! Örn: `!taktik rmadrid`, `!taktik barca`');

        let squadList = '';
        let totalVal = 0;
        club.squad.forEach((s, idx) => {
            totalVal += s.val;
            squadList += `**${idx + 1} ${s.pos}** — <@${s.id}> **${s.val}M**\n`;
        });

        const embed = new EmbedBuilder()
            .setTitle(`TAKIM PROFİLİ — ${club.name}`)
            .setColor('#2b2d31')
            .setDescription(
                `🆔 \`${club.id}\` | 👑 T.D: ${club.manager ? `<@${club.manager}>` : 'Atanmadı'}\n\n` +
                `💰 **Kadro Değeri:** ${totalVal.toFixed(1)}M€\n` +
                `📋 **Diziliş:** ${club.tactic}\n` +
                `🎯 **Taktik:** ${club.mentality} • ${club.pres} • ${club.tempo}\n\n` +
                `**İlk 11 Listesi:**\n${squadList}`
            )
            .setImage('https://i.imgur.com/8Q9Z4fE.png')
            .setFooter({ text: 'Bir pozisyona oyuncu koymak/değiştirmek için butonları kullanın.' });

        const row1 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_pos_0_${club.id}`).setLabel('1. KL').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_pos_1_${club.id}`).setLabel('2. SLB').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_pos_2_${club.id}`).setLabel('3. STP').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_pos_3_${club.id}`).setLabel('4. STP').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`btn_pos_4_${club.id}`).setLabel('5. SGB').setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`btn_tactic_change_${club.id}`).setLabel('🎯 Taktik Ayarla').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId(`btn_clear_squad_${club.id}`).setLabel('Kadrocu Temizle').setStyle(ButtonStyle.Danger)
        );

        return message.channel.send({ embeds: [embed], components: [row1, row2] });
    }

    // ==========================================
    // 4. TRANSFER SİSTEMİ (.transfer)
    // ==========================================
    if (command === '.transfer') {
        const target = message.mentions.members.first();
        const clubId = args[2] ? args[2].toLowerCase() : null;

        if (!target || !clubId || !clubData.has(clubId)) {
            return message.reply('❌ Kullanım: `.transfer @oyuncu <takım_id>` (Örn: `.transfer @Ahmet rmadrid`)');
        }

        const club = clubData.get(clubId);
        const p = getPlayer(target.id, target.displayName);
        p.team = club.name;

        club.squad.push({ pos: 'YDK', name: target.displayName, val: p.value, isNpc: false, id: target.id });

        const targetMember = await message.guild.members.fetch(target.id);
        const teamRole = message.guild.roles.cache.find(r => r.name === club.roleName);
        if (teamRole) await targetMember.roles.add(teamRole);

        return message.channel.send(`🎉 **${target.displayName}**, **${club.name}** takımına transfer oldu!`);
    }

    // ==========================================
    // 5. REHBER VE KOMUT LİSTESİ (.komutlar)
    // ==========================================
    if (command === '.komutlar' || command === '.rehber') {
        const embed = new EmbedBuilder()
            .setTitle('📖 Freeze League Komut Paneli')
            .setColor('#2b2d31')
            .setDescription(
                '**⚙️ Yetkili Komutları:**\n' +
                '• `.kur` : Tüm kanalları siler ve dev lig sistemini izinleriyle kurar.\n' +
                '• `.dver @oyuncu <miktar>` : Oyuncunun piyasa değerini artırır.\n' +
                '• `.dal @oyuncu <miktar>` : Oyuncunun piyasa değerini düşürür.\n' +
                '• `.kaydet @üye <Futbolcu/TD> <TakımID>` : Üyeyi onaylar ve rolünü verir.\n\n' +
                '**🏟️ Taktik ve Kadro:**\n' +
                '• `!taktik <takım_id>` : Takım kadrosunu ve saha içi butonlu paneli açar.\n' +
                '• `.transfer @oyuncu <takım_id>` : Oyuncuyu takıma transfer eder.'
            );
        return message.channel.send({ embeds: [embed] });
    }
});

// ==========================================
// 6. ETKİLEŞİMLER, MODALLAR VE OTOMATİK T.D. KAYDI
// ==========================================
client.on('interactionCreate', async (interaction) => {
    try {
        if (interaction.isButton()) {
            if (interaction.customId === 'btn_reg_player') {
                const modal = new ModalBuilder().setCustomId('modal_reg_player').setTitle('Futbolcu Kayıt Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('p_name').setLabel('İsim | Ülke | Değer').setPlaceholder('Örn: D.Beckham | 🏴󠁧󠁢󠁥󠁮󠁧󠁿 | OOS | 1M€').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'btn_reg_td') {
                const modal = new ModalBuilder().setCustomId('modal_reg_td').setTitle('Teknik Direktör Kayıt Formu');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_info').setLabel('İsim | Ülke | Yaş | Kupa Sayısı').setPlaceholder('Örn: Kenan Papi | 🇹🇷 | 35 | 2 Kupa').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('td_team').setLabel('İstediğiniz Takım ID (rmadrid, barca vb.)').setStyle(TextInputStyle.Short).setRequired(true))
                );
                return await interaction.showModal(modal);
            }
        }

        if (interaction.type === InteractionType.ModalSubmit) {
            const logCh = interaction.guild.channels.cache.find(c => c.name.includes('kayıt-log'));

            if (interaction.customId === 'modal_reg_td') {
                const info = interaction.fields.getTextInputValue('td_info');
                const teamId = interaction.fields.getTextInputValue('td_team').toLowerCase();

                const club = clubData.get(teamId);
                if (!club) return await interaction.reply({ content: '❌ Geçersiz Takım ID!', ephemeral: true });

                if (club.manager) {
                    return await interaction.reply({ content: `❌ **${club.name}** takımının zaten bir Teknik Direktörü var (<@${club.manager}>)!`, ephemeral: true });
                }

                club.manager = interaction.user.id;
                const member = interaction.member;

                const unregRole = interaction.guild.roles.cache.find(r => r.name === 'Kayıtsız');
                const tdRole = interaction.guild.roles.cache.find(r => r.name === 'Teknik Direktör');
                const clubRole = interaction.guild.roles.cache.find(r => r.name === club.roleName);

                if (unregRole && member.roles.cache.has(unregRole.id)) await member.roles.remove(unregRole);
                if (tdRole) await member.roles.add(tdRole);
                if (clubRole) await member.roles.add(clubRole);

                await updateFreeTeamsChannel(interaction.guild);

                const embed = new EmbedBuilder()
                    .setTitle('🎉 Yeni Teknik Direktör Anlaşması!')
                    .setColor('#e67e22')
                    .setDescription(`**T.D.:** <@${interaction.user.id}>\n**Takım:** ${club.name}\n**Bilgiler:** ${info}`);

                if (logCh) await logCh.send({ embeds: [embed] });
                return await interaction.reply({ content: `✅ Tebrikler! **${club.name}** Teknik Direktörü oldunuz. Kayıtsız rolünüz kaldırıldı ve takım izinleriniz verildi.`, ephemeral: true });
            }
        }
    } catch (err) {
        console.error(err);
    }
});

// ==========================================
// GÜVENLİ BAĞLANTI & HATA AYIKLAMA (DEBUG)
// ==========================================
const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!token) {
    console.error('❌ KRİTİK HATA: Ortam değişkenlerinde TOKEN veya DISCORD_TOKEN bulunamadı!');
} else {
    console.log('🔑 Token bulundu, Discord servislerine bağlanılıyor...');
    client.login(token).catch(err => {
        console.error('❌ Discord Giriş Hatası:', err.message);
    });
}

