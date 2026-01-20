// 你的 GAS 連結
const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let currentPage = 'Content';
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {}; 
let allData = null;

async function initWebsite() {
    // 改回使用你的 GAS 連結
    await refreshData();
    
    if (!allData) return; // 如果沒拿到資料就停止

    const params = new URLSearchParams(window.location.search);
    currentPage = params.get('page') || 'Content';
    
    renderLogoAndSocial();
    updateCartUI();
    loadPage(currentPage);
}

async function refreshData() {
    try {
        // 使用你的連結，並加上一個隨機參數防止快取
        const res = await fetch(`${DATA_SOURCE_URL}?t=${new Date().getTime()}`);
        allData = await res.json();
        console.log("資料加載成功:", allData);
    } catch (e) {
        console.error("從 GAS 獲取資料失敗，這通常是 CORS 限制。請確保 GAS 腳本有 doGet() 並回傳 JSON。", e);
        alert("資料讀取失敗，請確認 GAS 連結是否正常開啟權限。");
    }
}

// 渲染 Header 圖標 (根據你的欄位名稱 URLLink, Image)
function renderLogoAndSocial() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');

    // 1. 處理 Logo (對應分頁 Content)
    const logoRow = allData["Content"]?.find(r => r.Type === 'Logo');
    if (logoRow) {
        logoContainer.innerHTML = `<img src="${logoRow.Image}" class="h-10 cursor-pointer" onclick="switchPage('Content')">`;
    }

    // 2. 處理 Social 圖標 (對應分頁 Content)
    const socials = allData["Content"]?.filter(r => r.Type === 'Social');
    if (socials && socials.length > 0) {
        storeContainer.innerHTML = socials.map(s => 
            `<a href="${s.URLLink}" target="_blank" class="hover:scale-110 transition-transform flex items-center">
                <img src="${s.Image}" class="h-6 w-6 object-contain opacity-80 hover:opacity-100">
            </a>`
        ).join('');
    }
}

// 頁面加載邏輯 (根據分頁 "產品資料")
function loadPage(pageName) {
    const app = document.getElementById('app');
    const params = new URLSearchParams(window.location.search);

    if (pageName === 'category') return renderCategoryList(params.get('cat'));
    if (pageName === 'product') return renderProductDetail(params.get('id'));
    if (pageName === 'checkout') return renderCheckoutPage();

    if (pageName === 'Content') {
        app.innerHTML = `
            <div class="py-20 text-center">
                <h1 class="text-4xl font-bold mb-4 text-[#5D4037]">Catbox 台灣代購</h1>
                <p class="text-lg text-[#8D6E63] mb-8">佛系台灣代購．台灣直送</p>
                <button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-10 py-4 rounded-full font-bold">查看商品</button>
            </div>`;
    } else if (pageName === 'Product Catalog') {
        renderCatalogMenu();
    } else if (pageName === 'Contact Us') {
        app.innerHTML = `<div class="max-w-md mx-auto py-10 text-center"><h2 class="text-2xl font-bold mb-6">聯絡我們</h2><p>如有查詢請透過上方社群圖標聯繫</p></div>`;
    }
}

// 分類選單
function renderCatalogMenu() {
    const categories = [...new Set(allData["產品資料"].map(p => p.Category).filter(Boolean))];
    let html = `<h2 class="text-2xl font-bold mb-8">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:border-[#8D6E63] transition-all text-xl font-bold">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 其他購物車、跳轉等函數維持原樣...
function switchPage(page, params = {}) {
    const u = new URL(window.location.origin + window.location.pathname);
    u.searchParams.set('page', page);
    for (const key in params) u.searchParams.set(key, params[key]);
    window.history.pushState({}, '', u);
    currentPage = page;
    loadPage(page);
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function updateCartUI() {
    const totalCount = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = totalCount;
}

initWebsite();
