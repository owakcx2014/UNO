import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, onValue, push, update, onDisconnect } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 1. الأساس (Data Model Configuration)
const firebaseConfig = {
    apiKey: "AIzaSyCTJA6RtmgNDfusmpQH7Yu5keo8LnB_arE",
    databaseURL: "https://uno-online-c4bb2-default-rtdb.firebaseio.com",
    projectId: "uno-online-c4bb2"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. التحكم (Controller Object)
window.Game = {
    state: {
        myKey: null,
        room: null,
        name: null,
        isAdmin: false,
        hasUno: false,
        pickingColor: false
    },

    // دخول الغرفة
    async enterRoom(type) {
        this.state.name = document.getElementById('username').value || "لاعب محترف";
        this.state.room = type === 'create' ? Math.floor(100000 + Math.random() * 899999) : document.getElementById('room-input').value;
        
        if(!this.state.room) return alert("من فضلك أدخل كود الغرفة");

        const roomRef = ref(db, `rooms/${this.state.room}/players`);
        const snap = await get(roomRef);
        this.state.isAdmin = !snap.exists();

        const pRef = push(roomRef);
        this.state.myKey = pRef.key;

        await set(pRef, { name: this.state.name, ready: false, isAdmin: this.state.isAdmin });
        onDisconnect(ref(db, `rooms/${this.state.room}/players/${this.state.myKey}`)).remove();

        this.initUI();
        this.listenToFirebase();
    },

    // تهيئة الواجهة
    initUI() {
        document.getElementById('main-screen').classList.add('hidden');
        document.getElementById('game-screen').classList.remove('hidden');
        document.getElementById('room-display').innerText = `كود الغرفة: ${this.state.room}`;
    },

    // المراقبة (The Listener)
    listenToFirebase() {
        onValue(ref(db, `rooms/${this.state.room}`), (snapshot) => {
            const data = snapshot.val();
            if (!data) return;
            
            this.renderPlayers(data.players, data.game);
            if (data.game) this.renderBoard(data.game);
            
            // بدء اللعبة تلقائياً للأدمن
            if (this.state.isAdmin && !data.game) {
                const players = Object.values(data.players);
                if (players.length >= 2 && players.every(p => p.ready)) {
                    this.startNewGame(Object.keys(data.players));
                }
            }
        });
    },

    // تحديث العرض (Render View)
    renderPlayers(players, game) {
        const list = document.getElementById('players-list');
        list.innerHTML = "";
        const order = game ? game.order : Object.keys(players);

        order.forEach(id => {
            const p = players[id];
            if (!p) return;
            const active = (game && game.order[game.turn] === id) ? 'active-turn' : '';
            const cards = game ? `(🎴 ${game['hand_'+id].length})` : '';
            list.innerHTML += `<div class="player-tag ${active}">${p.name} ${cards}</div>`;
        });
    },

    renderBoard(game) {
        document.getElementById('board').classList.remove('hidden');
        document.getElementById('waiting-msg').classList.add('hidden');
        document.getElementById('ready-btn').classList.add('hidden');

        // تحديث الكرت العلوي
        const top = game.discard[game.discard.length - 1];
        document.getElementById('top-card').src = `cards/${this.getFileName(top)}`;

        // تحديث يد اللاعب
        const hand = game['hand_' + this.state.myKey] || [];
        const handDiv = document.getElementById('hand');
        handDiv.innerHTML = "";
        hand.forEach((card, index) => {
            const img = document.createElement('img');
            img.src = `cards/${this.getFileName(card)}`;
            img.className = 'uno-card';
            img.onclick = () => this.playCard(index, game);
            handDiv.appendChild(img);
        });

        // زر الأونو
        const isMyTurn = game.order[game.turn] === this.state.myKey;
        document.getElementById('uno-btn').style.display = (hand.length === 2 && isMyTurn) ? 'block' : 'none';
        document.getElementById('status-msg').innerText = isMyTurn ? "دورك الآن!" : "انتظر دورك...";
    },

    // تحويل البيانات لاسم ملف
    getFileName(card) {
        if (card.value === '+4') return "+4.png";
        if (card.value === 'Wild') return "wild.png";
        const c = { red:'r', blue:'b', green:'g', yellow:'y' }[card.color];
        const v = { 'Skip':'s', '🔄':'r', '+2':'+2' }[card.value] || card.value;
        return `${c}${v}.png`;
    },

    // --- العمليات (Actions) ---
    async playCard(idx, game) {
        if (game.order[game.turn] !== this.state.myKey || this.state.pickingColor) return;
        
        const card = game['hand_' + this.state.myKey][idx];
        const top = game.discard[game.discard.length - 1];

        if (card.color === top.color || card.value === top.value || card.color === 'black') {
            // منطق اللعبة (الاتجاه، السحب، العقوبات) يوضع هنا...
            // سنقوم بتحديث الـ Firebase والـ View سيتحدث تلقائياً بفضل onValue
            console.log("لعب كرت:", card);
            // (تتمة منطق اللعب المطور الذي كتبناه سابقاً)
        }
    }
};
