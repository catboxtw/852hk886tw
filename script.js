const DATA_SOURCE_URL = 'https://script.google.com/macros/s/AKfycbxt4DiwnVxIIitoRb3OiAJqzQEFKHrQGiOhEEv29KQ939vValTksQgTZnNBE4SQWhlk8Q/exec';
const ORDER_SUBMIT_URL = 'https://script.google.com/macros/s/AKfycby_60SZg2v7JJYnhX3r9dve56ja3nJh6JFZ_bOW26xYOBqTP3jILWsDrTqRjWb6CNpSmA/exec';

let allData = null;
let cart = JSON.parse(localStorage.getItem('catbox_cart')) || {};

async function initWebsite() {
    console.log("初始化開始...");
    const loader = document.getElementById('loading-screen');

    try {
        // 1. 先嘗試抓取資料
        const res = await fetch(DATA_SOURCE_URL);
        
        // 檢查回應是否正常
        if (!res.ok) throw new Error('網路回應不正確');
        
        allData = await res.json();
        console.log("資料加載成功:", allData);

        // 2. 執行渲染（確保資料存在才執行）
        if (allData) {
            renderLogoAndSocial();
            updateCartUI();
            
            const params = new URLSearchParams(window.location.search);
            loadPage(params.get('page') || 'Content');
        }

    } catch (e) {
        console.error("初始化過程出錯:", e);
        // 如果抓不到資料，至少讓頁面顯示一些東西，不要全白
        const app = document.getElementById('app');
        if (app) {
            app.innerHTML = `
                <div class="py-20 text-center">
                    <p class="text-red-500 mb-4">資料載入失敗，請檢查網路連線</p>
                    <button onclick="location.reload()" class="bg-[#5D4037] text-white px-6 py-2 rounded-full">重新整理</button>
                </div>`;
        }
    } finally {
        // 3. 重點：無論成功或失敗，最後一定要把 Loading 關掉
        if (loader) {
            console.log("關閉 Loading 畫面");
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }
}

function renderCatalogMenu() {
    // 增加防錯處理：如果 allData 或 產品資料 是空的，不要執行 .map
    const items = (allData && allData["產品資料"]) || [];
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `<div class="py-20 text-center">暫無商品資料</div>`;
        return;
    }
    
    const categories = [...new Set(items.map(p => p.Category).filter(Boolean))];
    // ... 後續原有的渲染代碼 ...
}

// 渲染 Header
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
        return `
            <a href="${link}" target="_blank" class="hover:scale-110 transition-transform block">
                <img src="${img}" class="h-6 w-6 object-cover rounded-full border border-[#D7CCC8]" onerror="this.src='https://cdn-icons-png.flaticon.com/512/2111/2111463.png'">
            </a>`;
    }).join('');
}

// 頁面主路由
function loadPage(pageName) {
    const app = document.getElementById('app');
    app.classList.remove('animate-fade-in');
    void app.offsetWidth; 
    app.classList.add('animate-fade-in');

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
        app.innerHTML = `<div class="max-w-md mx-auto py-20 text-center bg-white rounded-3xl border border-[#D7CCC8] shadow-sm"><h2 class="text-2xl font-bold mb-6">聯絡我們</h2><p class="text-[#8D6E63]">如有查詢請透過上方社群圖標聯繫</p></div>`;
    }
}

// 1. 分類選單
function renderCatalogMenu() {
    console.log("目前的 allData 內容為:", allData); // 除錯用
    
    // 如果 allData 本身就是陣列，就直接用；如果是物件，就抓 ["產品資料"]
    const items = Array.isArray(allData) ? allData : (allData["產品資料"] || []);
    
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `
            <div class="py-20 text-center">
                <p class="text-gray-500">暫時沒有商品資料 (Array is empty)</p>
            </div>`;
        return;
    }
    const categories = [...new Set(items.map(p => p.Category).filter(Boolean))];
    let html = `<h2 class="text-2xl font-bold mb-8 text-[#5D4037] border-l-4 border-[#8D6E63] pl-4">商品分類</h2><div class="grid grid-cols-1 md:grid-cols-3 gap-6">`;
    categories.forEach(cat => {
        html += `<div onclick="switchPage('category', {cat:'${cat}'})" class="p-12 bg-white border border-[#D7CCC8] rounded-3xl cursor-pointer hover:shadow-xl hover:border-[#8D6E63] transition-all text-xl font-bold text-center">${cat}</div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 2. 某分類下的商品列表
function renderCategoryList(catName) {
    const products = (allData["產品資料"] || []).filter(p => p.Category === catName);
    let html = `<div class="mb-8"><button onclick="switchPage('Product Catalog')" class="text-[#8D6E63] hover:underline">← 返回分類</button> <span class="mx-2">/</span> <span class="font-bold">${catName}</span></div>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-6">`;
    products.forEach(p => {
        const id = p["Item code (ERP)"];
        const img = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';
        html += `
            <div class="bg-white border border-[#D7CCC8] rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                <img src="${img}" class="w-full aspect-square object-cover rounded-xl cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                <h4 class="mt-4 font-bold truncate text-[#5D4037]">${p["Chinese product name"]}</h4>
                <p class="text-[#8D6E63] font-bold mt-1">HK$ ${p.Price}</p>
                <button onclick="addToCart('${id}', '${p["Chinese product name"]}', ${p.Price}, '${img}')" class="w-full mt-4 bg-[#5D4037] text-white py-2 rounded-lg text-sm hover:bg-[#4E342E]">+ 加入購物車</button>
            </div>`;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

function renderCategoryProducts(cat) {
    const items = allData["產品資料"].filter(p => p.Category === cat);
    let html = `
        <div class="flex items-center gap-4 mb-8">
            <button onclick="switchPage('Content')" class="text-[#8D6E63]">商品分類</button>
            <span class="text-gray-400">/</span>
            <h2 class="text-2xl font-bold text-[#5D4037]">${cat}</h2>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
    `;

    items.forEach(p => {
        const id = p["Item code (ERP)"];
        const firstImg = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';
        
        html += `
            <div class="bg-white rounded-3xl border border-[#D7CCC8] overflow-hidden hover:shadow-lg transition-all group">
                <div class="relative cursor-pointer" onclick="switchPage('product', {id:'${id}'})">
                    <img src="${optimizeCloudinary(firstImg, 400)}" class="w-full aspect-square object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-4">
                    <h3 class="font-bold text-[#5D4037] mb-1 truncate text-sm md:text-base">${p["Chinese product name"]}</h3>
                    <div class="flex items-center justify-between mt-3">
                        <span class="text-[#8D6E63] font-bold">HK$ ${p.Price}</span>
                        
                        <div id="btn-container-${id}" class="w-24 md:w-28">
                            ${getMiniCartButtonUI(id, p["Chinese product name"], p.Price, firstImg)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    document.getElementById('app').innerHTML = html + `</div>`;
}

// 專為分類頁設計的微型按鈕 UI
function getMiniCartButtonUI(id, name, price, img) {
    const item = cart[id];
    if (!item) {
        return `
            <button onclick="addToCart('${id}', '${name.replace(/'/g, "\\'")}', ${price}, '${img}')" 
                    class="w-full bg-[#5D4037] text-white py-2 rounded-full text-xs font-bold hover:bg-[#4E342E] transition-all">
                + 加入
            </button>`;
    }
    return `
        <div class="flex items-center justify-between bg-[#F5F5F5] rounded-full p-1 border border-[#D7CCC8]">
            <button onclick="updateAllUIQty('${id}', -1)" class="w-8 h-8 flex items-center justify-center text-[#5D4037] font-bold">-</button>
            <span class="text-[#5D4037] font-bold text-xs">${item.qty}</span>
            <button onclick="updateAllUIQty('${id}', 1)" class="w-8 h-8 flex items-center justify-center text-[#5D4037] font-bold">+</button>
        </div>`;
}

// 輔助函數：優化 Cloudinary 網址 (提升讀取速度)
function optimizeCloudinary(url, width = 800) {
    if (!url || !url.includes('cloudinary.com')) return url;
    return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
}

// 3. 商品詳情頁
function renderProductDetail(id) {
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p) return;

    const rawImages = p["圖片"] || ""; 
    const imageList = rawImages.split(',').map(img => img.trim()).filter(img => img !== "");
    const firstImg = imageList.length > 0 ? imageList[0] : '';

    let html = `
        <button onclick="window.history.back()" class="mb-8 text-[#8D6E63] flex items-center gap-2 hover:translate-x-[-4px] transition-transform">
            ← 返回
        </button>
        
        <div class="flex flex-col md:flex-row gap-12 bg-white p-6 md:p-10 rounded-3xl border border-[#D7CCC8] shadow-sm">
            <div class="md:w-1/2">
                <div class="main-image-container mb-4 overflow-hidden rounded-2xl bg-[#F9F8F7]">
                    <img id="main-display-img" src="${optimizeCloudinary(firstImg, 800)}" class="w-full aspect-square object-cover shadow-inner">
                </div>
                ${imageList.length > 1 ? `
                <div class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    ${imageList.map(img => `
                        <img src="${optimizeCloudinary(img, 200)}" 
                             onclick="document.getElementById('main-display-img').src='${optimizeCloudinary(img, 800)}'"
                             class="w-20 h-20 object-cover rounded-lg cursor-pointer border-2 border-transparent hover:border-[#8D6E63] transition-all flex-shrink-0">
                    `).join('')}
                </div>` : ''}
            </div>

            <div class="md:w-1/2 text-left flex flex-col">
                <span class="text-xs font-bold tracking-widest text-[#A1887F] uppercase">${p.Category || ''}</span>
                <h1 class="text-3xl font-bold mt-2 mb-4 text-[#5D4037]">${p["Chinese product name"]}</h1>
                
                <div class="flex items-center justify-between mb-8 pb-6 border-b">
                    <p class="text-3xl text-[#8D6E63] font-bold italic">HK$ ${p.Price}</p>
                    <div id="btn-container-${id}" class="w-40"> ${getCartButtonUI(id, p["Chinese product name"], p.Price, firstImg)}
                    </div>
                </div>

                <div class="flex-grow">
                    <h3 class="text-sm font-bold text-[#5D4037] mb-3">商品描述</h3>
                    <div class="text-gray-600 text-sm leading-relaxed mb-10">
                        ${(p["中文描述"] || "商品詳情準備中...").replace(/\n/g, '<br>')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('app').innerHTML = html;
}

// 4. 結帳頁面 (Checkout)
function renderCheckoutPage() {
    const items = Object.entries(cart);
    let total = 0;
    if (items.length === 0) {
        document.getElementById('app').innerHTML = `<div class="py-20 text-center animate-fade-in"><p class="text-gray-400 mb-6 font-bold">您的購物車目前是空的</p><button onclick="switchPage('Product Catalog')" class="bg-[#5D4037] text-white px-8 py-3 rounded-xl">去逛逛</button></div>`;
        return;
    }
    
    let itemsHtml = items.map(([id, item]) => {
        total += item.price * item.qty;
        return `
        <div class="flex items-center justify-between py-4 border-b">
            <div class="flex items-center gap-4">
                <img src="${item.img}" 
                     class="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition" 
                     onclick="switchPage('product', {id:'${id}'})">
                <div>
                    <div class="font-bold text-sm text-[#5D4037] cursor-pointer hover:text-[#8D6E63]" onclick="switchPage('product', {id:'${id}'})">${item.name}</div>
                    <div class="text-xs text-[#8D6E63]">HK$ ${item.price} x ${item.qty}</div>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <button onclick="changeQty('${id}', -1)" class="w-8 h-8 border border-[#D7CCC8] rounded-full flex items-center justify-center hover:bg-gray-50">-</button>
                <span class="w-6 text-center font-medium">${item.qty}</span>
                <button onclick="changeQty('${id}', 1)" class="w-8 h-8 border border-[#D7CCC8] rounded-full flex items-center justify-center hover:bg-gray-50">+</button>
            </div>
        </div>`;
    }).join('');

    // ... 下方的結帳表單 HTML 保持不變 ...
    document.getElementById('app').innerHTML = `
        <div class="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 animate-fade-in">
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8]">
                <h2 class="text-xl font-bold mb-6">購物清單</h2>
                <div class="mb-4">${itemsHtml}</div>
                <div class="text-right font-bold text-2xl text-[#5D4037] pt-4">總計: HK$${total}</div>
            </div>
            <div class="md:w-1/2 bg-white p-8 rounded-3xl border border-[#D7CCC8]">
                <h2 class="text-xl font-bold mb-6">收件資料</h2>
                <form onsubmit="submitOrder(event, ${total})" class="space-y-4 text-left">
                    <input name="name" placeholder="姓名" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] focus:outline-none focus:border-[#8D6E63]">
                    <input name="phone" placeholder="電話" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] focus:outline-none focus:border-[#8D6E63]">
                    <textarea name="address" placeholder="收件地址 / 順豐站碼" required class="w-full p-4 border rounded-xl bg-[#FAFAFA] h-28 focus:outline-none focus:border-[#8D6E63]"></textarea>
                    <button type="submit" id="subBtn" class="w-full bg-[#5D4037] text-white py-4 mt-6 rounded-xl font-bold shadow-lg hover:bg-[#4E342E] transition">提交訂單</button>
                </form>
            </div>
        </div>`;
}

// 5. 提交訂單功能
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
        cart = {}; 
        localStorage.removeItem('catbox_cart');
        switchPage('Content');
    } catch (err) {
        alert("提交完成！");
        cart = {}; localStorage.removeItem('catbox_cart');
        switchPage('Content');
    }
}

function updateAllUIQty(id, delta) {
    changeQty(id, delta); // 更新 localStorage 和 cart 物件
    
    // 獲取商品資訊以重新渲染按鈕
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    if (!p) return;
    const firstImg = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';

    // 找到所有該商品的按鈕容器 (詳情頁和列表頁可能同時存在)
    const containers = document.querySelectorAll(`[id="btn-container-${id}"]`);
    containers.forEach(container => {
        // 判斷當前是詳情頁的大按鈕還是列表頁的小按鈕
        if (container.classList.contains('w-40')) {
            container.innerHTML = getCartButtonUI(id, p["Chinese product name"], p.Price, firstImg);
        } else {
            container.innerHTML = getMiniCartButtonUI(id, p["Chinese product name"], p.Price, firstImg);
        }
    });
}

// 修改原有的 addToCart，使其不彈窗並局部更新
function addToCart(id, name, price, img) {
    if (cart[id]) cart[id].qty += 1;
    else cart[id] = { name, price, img, qty: 1 };
    
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI(); // 更新導航欄的小紅點數量
    updateAllUIQty(id, 0); // 觸發按鈕狀態切換
}

function changeQty(id, delta) {
    if (cart[id].qty === 1 && delta === -1) {
        // 當數量為 1 且用戶點擊減號時，跳出提醒
        if (confirm(`確定要從購物車中移除「${cart[id].name}」嗎？`)) {
            delete cart[id];
        } else {
            return; // 使用者按取消，則不動作
        }
    } else {
        cart[id].qty += delta;
        if (cart[id].qty <= 0) delete cart[id];
    }
    
    localStorage.setItem('catbox_cart', JSON.stringify(cart));
    updateCartUI();
    renderCheckoutPage(); // 重新渲染結帳頁面
}

function updateCartUI() {
    const count = Object.values(cart).reduce((sum, item) => sum + item.qty, 0);
    document.getElementById('cart-count-nav').innerText = count;
}

// 取得按鈕 HTML 的輔助函數
function getCartButtonUI(id, name, price, img) {
    const item = cart[id];
    
    // 如果購物車內沒有此商品
    if (!item) {
        return `
            <button onclick="addToCart('${id}', '${name}', ${price}, '${img}')" 
                    class="w-full bg-[#5D4037] text-white px-12 py-4 rounded-xl font-bold shadow-lg hover:bg-[#4E342E] transition-all active:scale-95">
                放入購物車
            </button>`;
    }

    // 如果已經在購物車，顯示「數量控制器」
    return `
        <div class="flex items-center justify-between bg-[#EFEBE9] rounded-xl p-1 border border-[#D7CCC8]">
            <button onclick="updateDetailQty('${id}', -1)" class="px-6 py-4 text-[#5D4037] font-bold text-xl hover:bg-[#D7CCC8] rounded-l-xl transition">-</button>
            <div class="flex flex-col items-center">
                <span class="text-[#5D4037] font-bold">${item.qty}</span>
                <span class="text-[10px] text-[#8D6E63]">已加入購物車</span>
            </div>
            <button onclick="updateDetailQty('${id}', 1)" class="px-6 py-4 text-[#5D4037] font-bold text-xl hover:bg-[#D7CCC8] rounded-r-xl transition">+</button>
        </div>`;
}

// 專門給詳情頁使用的數量更新函數，確保 UI 會同步刷新
function updateDetailQty(id, delta) {
    changeQty(id, delta); // 調用原有的邏輯處理資料
    const p = allData["產品資料"].find(item => String(item["Item code (ERP)"]) === String(id));
    // 重新渲染按鈕容器
    const btnContainer = document.getElementById(`btn-container-${id}`);
    if (btnContainer) {
        const img = p["圖片"] ? p["圖片"].split(',')[0].trim() : '';
        btnContainer.innerHTML = getCartButtonUI(id, p["Chinese product name"], p.Price, img);
    }
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

initWebsite();
