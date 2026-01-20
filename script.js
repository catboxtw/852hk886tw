const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let currentPage = 'Content';
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {}; 
let allData = null;

async function initWebsite() {
    await refreshData();
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    
    renderLogoAndSocial();
    updateCartUI();
    loadPage(currentPage);
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    loadPage(currentPage);
};

function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) u.searchParams.set(key, params[key]);
    window.history.pushState({}, '', u);
    currentPage = page;
    loadPage(page);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function refreshData() {
    try {
        const res = await fetch(DATA_SOURCE_URL);
        allData = await res.json();
    } catch (e) { console.error("資料加載失敗", e); }
}

function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);

    if (pageName === 'category') return renderCategoryList(params.get('cat'));
    if (pageName === 'product') return renderProductDetail(params.get('id'));
    if (pageName === 'checkout') return renderCheckoutPage();

    if (pageName === 'Content') {
        app.innerHTML = `
            <div class="py-20 text-center animate-fade-in">
                <h1 class="text-4xl font-bold mb-4">Catbox 台灣代購</h1>
                <p class="text-lg text-[#8D6E63] mb-8">專業提供 7仔預購、蝦皮代購及各大正版授權商品</p>
                <button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-10 py-4 rounded-full hover:bg-[#4E342E] shadow-lg transition font-bold">立即選購</button>
            </div>`;
    } else if (pageName === 'Product Catalog') {
        renderCatalogMenu();
    } else if (pageName === 'Contact Us') {
        app.innerHTML = `<div class="max-w-md mx-auto py-10 text-center bg-white border border-[#D7CCC8] rounded-3xl p-10"><h2 class="text-2xl font-bold mb-6">聯絡我們</h2><p class="text-[#8D6E63] mb-2">如有任何代購需求或售後問題</p><p class="font-bold">請點擊上方社群圖標與我們聯繫</p></div>`;
    }
}

function renderCatalogMenu() {
    const categories = [...new Set(allData["產品資料"].map(p => p.Category))];
    let html = `<h2 class="text-2xl font-bold mb-8 text-left border-l-4 border-[#8D6E63] pl-4">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:shadow-xl hover:border-[#8D6E63] transition-all text-xl font-bold">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

function renderCategoryList(catName) {
    const filtered = allData["產品資料"].filter(p => p.Category === catName);
    let html = `<div class="flex items-center gap-2 mb-8"><button onclick="switchPage('Product Catalog')" class="text-[#8D6E63] hover:underline">商品分類</button> <span>/</span> <span class="font-bold">${catName}</span></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">`;
    filtered.forEach(p => {
        const id = p["Item code (ERP)"];
        const img = p["圖片"] ? p["圖片"].split(',')[0] : '';
        html += `
            <div class="bg-white border border-[#D7CCC8] rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <img src="${img}" class="w-full aspect-square object-cover rounded-xl cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                <h4 class="mt-4 font-bold truncate text-[#5D4037]">${p["Chinese product name"]}</h4>
                <p class="text-[#8D6E63] font-bold mt-1">HK$ ${p.Price}</p>
                <button onclick="changeQuantity('${id}', 1, {name:'${p["Chinese product name"]}', price:${p.Price}, img:'${img}'})" class="w-full mt-4 bg-[#5D4037] text-white py-2 rounded-lg text-sm hover:bg-[#4E342E]">+ 加入購物車</button>
            </div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

function renderProductDetail(id) {
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p) return;
    document.getElementById('app').innerHTML = `
        <button onclick="window.history.back()" class="mb-8 text-[#8D6E63] flex items-center gap-2">← 返回上一頁</button>
        <div class="flex flex-col md:flex-row gap-12 bg-white p-10 rounded-3xl border border-[#D7CCC8]">
            <div class="md:w-1/2"><img src="${p["圖片"].split(',')[0]}" class="w-full rounded-2xl shadow-inner"></div>
            <div class="md:w-1/2 text-left">
                <span class="text-xs text-[#A1887F] tracking-widest uppercase font-bold">ITEM ID: ${id}</span>
                <h1 class="text-3xl font-bold mt-2 mb-4">${p["Chinese product name"]}</h1>
                <p class="text-3xl text-[#8D6E63] font-bold mb-8">HK$ ${p.Price}</p>
                <div class="text-gray-600 leading-relaxed mb-10 border-t pt-6 text-sm">${(p["中文描述"] || "商品詳情準備中...").replace(/\n/g, '<br>')}</div>
                <button onclick="changeQuantity('${id}', 1, {name:'${p["Chinese product name"]}', price:${p.Price}, img:'${p["圖片"].split(',')[0]}'})" class="w-full md:w-auto bg-[#5D4037] text-white px-12 py-4 rounded-xl font-bold hover:bg-[#4E342E] shadow-lg transition">放入購物車</button>
            </div>
        </div>`;
}

function renderCheckoutPage() {
    const items = Object.entries(cart);
    let total = 0;
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `<div class="py-20 text-center"><p class="text-gray-400 mb-6 font-bold">您的購物車目前是空的</p><button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-8 py-3 rounded-xl font-bold">查看所有商品</button></div>`;
        return;
    }
    let itemsHtml = items.map(([id, item]) => {
        total += item.price * item.qty;
        return `<div class="flex justify-between py-4 border-b border-[#F5F5F5] text-sm"><span>${item.name} <span class="text-[#A1887F]">x ${item.qty}</span></span><span class="font-bold">HK$${item.price * item.qty}</span></div>`;
    }).join('');

    document.getElementById('app').innerHTML = `
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8] shadow-sm">
                <h2 class="text-xl font-bold mb-6">訂單內容</h2>
                <div class="mb-4">${itemsHtml}</div>
                <div class="text-right font-bold text-2xl text-[#5D4037] pt-4">總計: HK$${total}</div>
            </div>
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8] shadow-sm">
                <h2 class="text-xl font-bold mb-6">收件資料</h2>
                <form onsubmit="submitOrder(event, ${total})" class="space-y-4 text-left">
                    <input name="name" placeholder="收件人姓名" required class="w-full p-4 border border-[#E0E0E0] rounded-xl bg-[#FAFAFA] focus:bg-white transition">
                    <input name="phone" placeholder="聯絡電話 (8位數字)" required pattern="[0-9]{8}" class="w-full p-4 border border-[#E0E0E0] rounded-xl bg-[#FAFAFA] focus:bg-white transition">
                    <textarea name="address" placeholder="順豐站代碼 / 收件地址" required class="w-full p-4 border border-[#E0E0E0] rounded-xl bg-[#FAFAFA] focus:bg-white transition h-28"></textarea>
                    <div class="text-sm font-bold text-[#8D6E63] mt-4 ml-1">付款方式</div>
                    <select name="payment" class="w-full p-4 border border-[#E0E0E0] rounded-xl bg-[#FAFAFA] appearance-none">
                        <option value="FPS">轉數快 (FPS)</option>
                        <option value="PayMe">PayMe</option>
                        <option value="Bank">銀行轉帳</option>
                    </select>
                    <button type="submit" id="subBtn" class="w-full bg-[#5D4037] text-white py-4 mt-6 rounded-xl font-bold shadow-lg hover:bg-[#4E342E] transition-all">確認提交訂單</button>
                </form>
            </div>
        </div>`;
}

async function submitOrder(e, total) {
    e.preventDefault();
    const btn = document.getElementById('subBtn');
    btn.disabled = true; btn.innerText = "訂單提交中...";
    const fd = new FormData(e.target);
    const summary = Object.values(cart).map(i => `${i.name}x${i.qty}`).join(', ');
    const params = new URLSearchParams({
        date: new Date().toLocaleString(),
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        items: summary,
        total: total,
        payment: fd.get('payment')
    });
    try {
        await fetch(`${ORDER_SUBMIT_URL}?${params.toString()}`, { method: 'POST', mode: 'no-cors' });
        alert("訂單已成功提交！我們會透過 WhatsApp 聯絡您確認細節。");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    } catch (err) {
        alert("提交完成！");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    }
}

function changeQuantity(id, delta, productData = null) {
    let currentQty = cart[id] ? cart[id].qty : 0;
    let newQty = Math.max(0, currentQty + delta);
    if (newQty === 0) delete cart[id];
    else if (!cart[id] && productData) cart[id] = { ...productData, qty: newQty };
    else if (cart[id]) cart[id].qty = newQty;
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
}

function updateCartUI() {
    const totalCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = totalCount;
}

function renderLogoAndSocial() {
    // 1. 處理 Logo (對應 Type 為 Logo)
    const logoData = allData["Content"]?.find(r => r.Type === 'Logo');
    if (logoData) {
        // 這裡確保讀取你的 Image 欄位
        document.getElementById('logo-container').innerHTML = `<img src="${logoData.Image}" class="h-10 cursor-pointer" onclick="switchPage('Content')">`;
    }
    
    // 2. 處理社群圖標 (對應 Type 為 Social)
    const socials = allData["Content"]?.filter(r => r.Type === 'Social');
    if (socials && socials.length > 0) {
        document.getElementById('store-container').innerHTML = socials.map(s => 
            `<a href="${s.URLLink}" target="_blank" class="hover:scale-110 transition-transform block">
                <img src="${s.Image}" class="h-6 w-6 object-contain opacity-80 hover:opacity-100">
            </a>`
        ).join('');
    } else {
        console.log("未偵測到 Social 類型的資料，請檢查 Content 分頁的 Type 欄位是否正確");
    }
}

initWebsite();
