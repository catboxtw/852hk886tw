// --- 1. 基礎設定與資料初始化 ---
const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let allData = null;
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {};

// 初始化網站
async function initWebsite() {
    const loader = document.getElementById('loading-screen');
    try {
        const res = await fetch(DATA_SOURCE_URL);
        if (!res.ok) throw new Error('網路回應不正確');
        allData = await res.json();
        
        if (allData) {
            renderLogoAndSocial();
            updateCartUI();
            const params = new URLSearchParams(window.location.search);
            loadPage(params.get('page') || 'Content');
        }
    } catch (e) {
        console.error("初始化出錯:", e);
        document.getElementById('app').innerHTML = `<div class="py-20 text-center"><p class="text-red-500 mb-4">資料載入失敗</p><button onclick="location.reload()" class="bg-[#5D4037] text-white px-6 py-2 rounded-full">重新整理</button></div>`;
    } finally {
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 500);
        }
    }
}

// --- 2. 導航與路由邏輯 ---
function renderLogoAndSocial() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');
    const content = allData["Content"] || [];
    
    const logoRow = content.find(r => r.Type === 'Logo');
    if (logoRow) {
        let img = (logoRow.Image || logoRow.ImageURL || "").toString().trim();
        logoContainer.innerHTML = `<img src="${img}" class="h-10" alt="Logo">`;
    }

    const socials = content.filter(r => r.Type === 'Social');
    storeContainer.innerHTML = socials.map(s => {
        let img = (s.Image || s.ImageURL || "").toString().trim();
        let link = (s.URLLink || s.Link || "#").toString().trim();
        return `<a href="${link}" target="_blank" class="hover:scale-110 transition-transform block"><img src="${img}" class="h-6 w-6 object-cover rounded-full border border-[#D7CCC8]" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2111/2111463.png'"></a>`;
    }).join('');
}

function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);
    
    // 頁面切換動畫觸發
    app.classList.remove('animate-fade-in');
    void app.offsetWidth; 
    app.classList.add('animate-fade-in');

    if (pageName === 'category') return renderCategoryList(params.get('cat'));
    if (pageName === 'product') return renderProductDetail(params.get('id'));
    if (pageName === 'checkout') return renderCheckoutPage();

    if (pageName === 'Content') {
        app.innerHTML = `
            <div class="py-20 text-center">
                <h1 class="text-4xl font-bold mb-4 text-[#5D4037]">Catbox 台灣代購</h1>
                <p class="text-lg text-[#8D6E63] mb-10">佛系台灣代購．台灣直送</p>
                <button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-12 py-4 rounded-full font-bold shadow-lg hover:bg-[#4E342E] transition">開始選購</button>
            </div>`;
    } else if (pageName === 'Product Catalog') {
        renderCatalogMenu();
    } else if (pageName === 'Contact Us') {
        app.innerHTML = `<div class="max-w-md mx-auto py-20 text-center bg-white rounded-3xl border border-[#D7CCC8] shadow-sm"><h2 class="text-2xl font-bold mb-6">聯絡我們</h2><p class="text-[#8D6E63]">如有查詢請透過上方社群圖標聯繫</p></div>`;
    }
}

// --- 3. 商品展現邏輯 (優化載入速度) ---
function renderCatalogMenu() {
    const items = (allData && allData["產品資料"]) || [];
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `<div class="py-20 text-center text-gray-500">暫無商品資料</div>`;
        return;
    }
    const categories = [...new Set(items.map(p => p.Category).filter(Boolean))];
    let html = `<h2 class="text-2xl font-bold mb-8 text-[#5D4037] border-l-4 border-[#8D6E63] pl-4">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:shadow-xl hover:border-[#8D6E63] transition-all text-xl font-bold text-center">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

function renderCategoryList(catName) {
    const products = (allData["產品資料"] || []).filter(p => p.Category === catName);
    let html = `
        <div class="mb-8 flex items-center gap-4">
            <button onclick="switchPage('Product Catalog')" class="text-[#8D6E63] hover:underline">← 返回分類</button> 
            <span class="text-gray-300">/</span> 
            <span class="font-bold text-[#5D4037]">${catName}</span>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-6">`;

    products.forEach(p => {
        const id = p["Item code (ERP)"];
        const img = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';
        
        html += `
            <div class="bg-white border border-[#D7CCC8] rounded-3xl p-4 shadow-sm hover:shadow-md transition group">
                <div class="overflow-hidden rounded-2xl mb-4 bg-[#F9F8F7] relative aspect-square">
                    <img src="${optimizeCloudinary(img, 50, true)}" class="w-full h-full object-cover absolute inset-0 blur-lg scale-110">
                    <img src="${optimizeCloudinary(img, 400)}" loading="lazy"
                         class="w-full h-full object-cover relative z-10 cursor-pointer group-hover:scale-105 transition-all duration-500 opacity-0"
                         onload="this.classList.remove('opacity-0'); this.classList.add('opacity-100')"
                         onclick="switchPage('product', {id:'${id}'})">
                </div>
                <h4 class="font-bold truncate text-[#5D4037] text-sm md:text-base">${p["Chinese product name"]}</h4>
                <div class="flex items-center justify-between mt-3">
                    <p class="text-[#8D6E63] font-bold text-sm">HK$ ${p.Price}</p>
                    <div id="btn-container-${id}" class="mini-btn">
                        ${getMiniCartButtonUI(id, p["Chinese product name"], p.Price, img)}
                    </div>
                </div>
            </div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

function renderProductDetail(id) {
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p) return;
    const imageList = (p["圖片"] || "").split(',').map(img => img.trim()).filter(Boolean);
    const firstImg = imageList[0] || '';

    let html = `
        <button onclick="window.history.back()" class="mb-8 text-[#8D6E63] flex items-center gap-2 hover:translate-x-[-4px] transition-transform">← 返回</button>
        <div class="flex flex-col md:flex-row gap-12 bg-white p-6 md:p-10 rounded-3xl border border-[#D7CCC8] shadow-sm">
            <div class="md:w-1/2">
                <div class="main-image-container mb-4 overflow-hidden rounded-2xl bg-[#F9F8F7] relative aspect-square">
                    <img src="${optimizeCloudinary(firstImg, 50, true)}" class="w-full h-full object-cover absolute inset-0 blur-xl scale-110">
                    <img id="main-display-img" src="${optimizeCloudinary(firstImg, 800)}" class="w-full h-full object-cover relative z-10 transition-opacity duration-500 opacity-0"
                         onload="this.classList.remove('opacity-0'); this.classList.add('opacity-100')">
                </div>
                <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    ${imageList.map(img => `
                        <div class="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden border-2 border-transparent hover:border-[#8D6E63] transition-all cursor-pointer">
                            <img src="${optimizeCloudinary(img, 200)}" 
                                 onclick="const m=document.getElementById('main-display-img'); m.style.opacity='0'; setTimeout(()=>m.src='${optimizeCloudinary(img, 800)}', 200)" 
                                 class="w-full h-full object-cover" loading="lazy">
                        </div>`).join('')}
                </div>
            </div>
            <div class="md:w-1/2 text-left flex flex-col">
                <span class="text-xs font-bold tracking-widest text-[#A1887F] uppercase">${p.Category || ''}</span>
                <h1 class="text-3xl font-bold mt-2 mb-4 text-[#5D4037] leading-tight">${p["Chinese product name"]}</h1>
                <div class="flex items-center justify-between mb-8 pb-6 border-b border-[#F0EAE6]">
                    <p class="text-3xl text-[#8D6E63] font-bold italic">HK$ ${p.Price}</p>
                    <div id="btn-container-${id}" class="detail-btn">
                        ${getCartButtonUI(id, p["Chinese product name"], p.Price, firstImg)}
                    </div>
                </div>
                <div class="flex-grow">
                    <h3 class="text-sm font-bold text-[#5D4037] mb-3">商品描述</h3>
                    <div class="text-gray-600 text-sm leading-relaxed mb-10">${(p["中文描述"] || "商品詳情準備中...").replace(/\n/g, '<br>')}</div>
                </div>
            </div>
        </div>`;
    document.getElementById('app').innerHTML = html;
}

// --- 4. 購物車核心邏輯 (解決手機卡頓) ---
function handleQtyChange(id, delta) {
    const item = cart[id];
    
    if (item) {
        if (item.qty === 1 && delta === -1) {
            if (!confirm(`確定要移除「${item.name}」嗎？`)) return;
            delete cart[id];
        } else {
            item.qty += delta;
            if (item.qty <= 0) delete cart[id];
        }
    } else if (delta > 0) {
        const p = allData["產品資料"].find(i => String(i["Item code (ERP)"]) === String(id));
        if (p) {
            cart[id] = { 
                name: p["Chinese product name"], 
                price: p.Price, 
                img: p["圖片"] ? p["圖片"].split(',')[0].trim() : '', 
                qty: 1 
            };
        }
    }

    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
    refreshProductButtons(id); // 局部刷新按鈕，不跳頁
    
    // 如果在結帳頁，則刷新結帳清單
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'checkout') renderCheckoutPage();
}

function refreshProductButtons(id) {
    const containers = document.querySelectorAll(`[id="btn-container-${id}"]`);
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p || containers.length === 0) return;

    const img = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';
    containers.forEach(c => {
        if (c.classList.contains('detail-btn')) {
            c.innerHTML = getCartButtonUI(id, p["Chinese product name"], p.Price, img);
        } else {
            c.innerHTML = getMiniCartButtonUI(id, p["Chinese product name"], p.Price, img);
        }
    });
}

function updateCartUI() {
    const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    const badge = document.getElementById('cart-count-nav');
    if (badge) badge.innerText = count;
}

// --- 5. 結帳與提交 ---
function renderCheckoutPage() {
    const items = Object.entries(cart);
    let total = 0;
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `<div class="py-20 text-center"><p class="text-gray-400 mb-6 font-bold">購物車目前是空的</p><button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-8 py-3 rounded-xl">去選購商品</button></div>`;
        return;
    }

    let itemsHtml = items.map(([id, item]) => {
        total += item.price * item.qty;
        return `
        <div class="flex items-center justify-between py-4 border-b">
            <div class="flex items-center gap-4">
                <img src="${item.img}" class="w-16 h-16 object-cover rounded-lg cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                <div class="text-left">
                    <div class="font-bold text-sm text-[#5D4037]">${item.name}</div>
                    <div class="text-xs text-[#8D6E63]">HK$ ${item.price}</div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="handleQtyChange('${id}', -1)" class="w-8 h-8 border border-[#D7CCC8] rounded-full flex items-center justify-center hover:bg-gray-50">-</button>
                <span class="w-6 text-center font-medium">${item.qty}</span>
                <button onclick="handleQtyChange('${id}', 1)" class="w-8 h-8 border border-[#D7CCC8] rounded-full flex items-center justify-center hover:bg-gray-50">+</button>
            </div>
        </div>`;
    }).join('');

    document.getElementById('app').innerHTML = `
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-8">
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8] shadow-sm">
                <h2 class="text-xl font-bold mb-6 text-left">購物清單</h2>
                <div class="mb-4">${itemsHtml}</div>
                <div class="text-right font-bold text-2xl text-[#5D4037] pt-4 border-t">總計: HK$${total}</div>
            </div>
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8] shadow-sm">
                <h2 class="text-xl font-bold mb-6 text-left">收件資料</h2>
                <form onsubmit="submitOrder(event, ${total})" class="space-y-4">
                    <input name="name" placeholder="姓名" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] focus:border-[#8D6E63] outline-none">
                    <input name="phone" placeholder="電話" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] focus:border-[#8D6E63] outline-none">
                    <textarea name="address" placeholder="收件地址 / 順豐站碼" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] h-28 focus:border-[#8D6E63] outline-none"></textarea>
                    <button type="submit" id="subBtn" class="w-full bg-[#5D4037] text-white py-4 mt-6 rounded-xl font-bold shadow-lg hover:bg-[#4E342E] transition">提交訂單</button>
                </form>
            </div>
        </div>`;
}

async function submitOrder(e, total) {
    e.preventDefault();
    const btn = document.getElementById('subBtn');
    btn.disabled = true; btn.innerText = "提交中...";
    
    const fd = new FormData(e.target);
    const summary = Object.values(cart).map(i => `${i.name}x${i.qty}`).join(', ');
    const params = new URLSearchParams({
        date: new Date().toLocaleString(),
        name: fd.get('name'),
        phone: fd.get('phone'),
        address: fd.get('address'),
        items: summary,
        total: total
    });

    try {
        await fetch(`${ORDER_SUBMIT_URL}?${params.toString()}`, { method: 'POST', mode: 'no-cors' });
        alert("訂單已成功提交！我們會盡快聯絡您。");
    } catch (err) {
        alert("提交完成！");
    } finally {
        cart = {};
        localStorage.removeItem('catbox_cart');
        updateCartUI();
        switchPage('Content');
    }
}

// --- 6. UI 組件與輔助函數 ---
function getMiniCartButtonUI(id, name, price, img) {
    const item = cart[id];
    if (!item) {
        return `<button onclick="handleQtyChange('${id}', 1)" class="w-8 h-8 flex items-center justify-center bg-[#5D4037] text-white rounded-full hover:shadow-lg transition-all font-bold">+</button>`;
    }
    return `
        <div class="flex items-center bg-[#F8F5F4] rounded-full border border-[#D7CCC8] p-0.5 shadow-sm">
            <button onclick="handleQtyChange('${id}', -1)" class="w-7 h-7 flex items-center justify-center text-[#5D4037] hover:bg-white rounded-full text-xs font-bold">-</button>
            <span class="px-2 text-[#5D4037] font-bold text-xs">${item.qty}</span>
            <button onclick="handleQtyChange('${id}', 1)" class="w-7 h-7 flex items-center justify-center text-[#5D4037] hover:bg-white rounded-full text-xs font-bold">+</button>
        </div>`;
}

function getCartButtonUI(id, name, price, img) {
    const item = cart[id];
    if (!item) {
        return `<button onclick="handleQtyChange('${id}', 1)" class="bg-[#5D4037] text-white px-8 py-2.5 rounded-full text-sm font-bold shadow-md hover:bg-[#4E342E] transition-all">放入購物車</button>`;
    }
    return `
        <div class="flex items-center bg-[#F8F5F4] rounded-full border border-[#D7CCC8] p-1 shadow-inner">
            <button onclick="handleQtyChange('${id}', -1)" class="w-8 h-8 flex items-center justify-center text-[#5D4037] hover:bg-white rounded-full transition font-bold">-</button>
            <span class="px-5 text-[#5D4037] font-bold text-base">${item.qty}</span>
            <button onclick="handleQtyChange('${id}', 1)" class="w-8 h-8 flex items-center justify-center text-[#5D4037] hover:bg-white rounded-full transition font-bold">+</button>
        </div>`;
}

function optimizeCloudinary(url, width = 800, blur = false) {
    if (!url || !url.includes('cloudinary.com')) return url;
    const params = blur ? `f_auto,q_auto,w_50,e_blur:1000` : `f_auto,q_auto,w_${width}`;
    return url.replace('/upload/', `/upload/${params}/`);
}

function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) u.searchParams.set(key, params[key]);
    window.history.pushState({}, '', u);
    loadPage(page);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

window.onpopstate = () => {
    const params = new URLSearchParams(window.location.search);
    loadPage(params.get('page') || 'Content');
};

// 啟動網站
initWebsite();
