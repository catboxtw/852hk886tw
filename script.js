const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let allData = null;
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {};

async function initWebsite() {
    try {
        const res = await fetch(DATA_SOURCE_URL);
        allData = await res.json();
        
        // 資料載入完成後，隱藏加載畫面
        const loader = document.getElementById('loading-screen');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);

        renderLogoAndSocial();
        updateCartUI();
        
        const params = new URLSearchParams(window.location.search);
        loadPage(params.get('page') || 'Content');
    } catch (e) {
        console.error("資料加載失敗:", e);
        document.getElementById('loading-screen').innerHTML = "<p>資料加載失敗，請檢查網路或連結權限</p>";
    }
}

function renderLogoAndSocial() {
    const logoContainer = document.getElementById('logo-container');
    const storeContainer = document.getElementById('store-container');

    const content = allData["Content"] || [];
    
    // 1. 處理 Logo
    const logoRow = content.find(r => r.Type === 'Logo');
    if (logoRow) {
        // 自動嘗試不同的欄位名稱 key
        let imgUrl = logoRow.Image || logoRow.ImageURL || logoRow["圖片"] || "";
        imgUrl = imgUrl.toString().trim(); // 清除可能存在的換行或空白
        if (imgUrl) {
            logoContainer.innerHTML = `<img src="${imgUrl}" class="h-10 object-contain" alt="Catbox Logo">`;
        }
    }

    // 2. 處理 Social 圖標
    const socials = content.filter(r => r.Type === 'Social');
    if (socials.length > 0) {
        storeContainer.innerHTML = socials.map(s => {
            // 取得圖片網址並清理
            let img = s.Image || s.ImageURL || s["圖片"] || "";
            img = img.toString().trim(); 
            
            // 取得連結並清理
            let link = s.URLLink || s.Link || s["連結"] || "#";
            link = link.toString().trim();

            return `
                <a href="${link}" target="_blank" class="hover:scale-110 transition-transform block" title="Social Link">
                    <img src="${img}" 
                         class="h-6 w-6 object-cover rounded-full border border-[#D7CCC8]" 
                         style="display: block;"
                         onerror="this.onerror=null; this.src='https://cdn-icons-png.flaticon.com/512/2111/2111463.png';">
                </a>
            `;
        }).join('');
    }
}

function loadPage(pageName) {
    const app = document.getElementById('app');
    app.classList.remove('animate-fade-in'); // 先移除動畫
    void app.offsetWidth; // 觸發 reflow
    app.classList.add('animate-fade-in'); // 重新加入動畫

    const params = new URLSearchParams(window.location.search);

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
        app.innerHTML = `<div class="max-w-md mx-auto py-20 text-center bg-white rounded-3xl border border-[#D7CCC8]">
            <h2 class="text-2xl font-bold mb-6">聯絡我們</h2>
            <p class="text-[#8D6E63]">請點擊右上角社群圖標與我們聯繫</p>
        </div>`;
    }
}

function renderCatalogMenu() {
    const items = allData["產品資料"] || [];
    const categories = [...new Set(items.map(p => p.Category).filter(Boolean))];
    let html = `<h2 class="text-2xl font-bold mb-8 text-[#5D4037] border-l-4 border-[#8D6E63] pl-4">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:shadow-xl hover:border-[#8D6E63] transition-all text-xl font-bold">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 切換頁面與 History API
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

// 購物車數量更新
function updateCartUI() {
    const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = count;
}

// 初始化
initWebsite();
