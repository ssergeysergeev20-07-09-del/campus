var products = [{
        id: 1,
        name: 'Сосиска в тесте',
        category: 'Выпечка',
        desc: 'Слоёное тесто',
        weight: '120 г',
        badge: 'Хит перемены',
        price: 65,
        emoji: '🌭'
    },
    {
        id: 2,
        name: 'Пирожок с картошкой',
        category: 'Выпечка',
        desc: 'Домашняя выпечка',
        weight: '100 г',
        badge: '',
        price: 45,
        emoji: '🥟'
    },
    {
        id: 3,
        name: 'Пюре с котлетой',
        category: 'Горячее',
        desc: 'Картофельное пюре',
        weight: '250 г',
        badge: 'Сытный обед',
        price: 140,
        emoji: '🍛'
    },
    {
        id: 4,
        name: 'Куриная котлета',
        category: 'Горячее',
        desc: 'С гарниром',
        weight: '220 г',
        badge: '',
        price: 155,
        emoji: '🍗'
    },
    {
        id: 5,
        name: 'Чай листовой',
        category: 'Напитки',
        desc: 'Чёрный или зелёный',
        weight: '250 мл',
        badge: '',
        price: 30,
        emoji: '🍵'
    },
    {
        id: 6,
        name: 'Сок яблочный',
        category: 'Напитки',
        desc: 'Освежающий напиток',
        weight: '200 мл',
        badge: '',
        price: 55,
        emoji: '🧃'
    }
];

var LT = String.fromCharCode(60);
var GT = String.fromCharCode(62);

function tag(name, attrs, inner) {
    return LT + name + (attrs ? ' ' + attrs : '') + GT + (inner || '') + LT + '/' + name + GT;
}

function voidTag(name, attrs) {
    return LT + name + (attrs ? ' ' + attrs : '') + GT;
}

// --- ЛОКАЛЬНАЯ БД (IndexedDB + экспорт/импорт orders_db.json) ---
var LocalOrderDB = (function() {
    var DB_NAME = 'CampusFoodITMoscowDB';
    var DB_VERSION = 2;
    var STORE_ORDERS = 'orders';
    var STORE_STATE = 'state';
    var db = null;

    function open() {
        return new Promise(function(resolve) {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            var req = window.indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = function(e) {
                var database = e.target.result;
                if (!database.objectStoreNames.contains(STORE_ORDERS)) {
                    database.createObjectStore(STORE_ORDERS, {
                        keyPath: 'id'
                    });
                }
                if (!database.objectStoreNames.contains(STORE_STATE)) {
                    database.createObjectStore(STORE_STATE, {
                        keyPath: 'key'
                    });
                }
            };
            req.onsuccess = function(e) {
                db = e.target.result;
                seedFromJsonFile().then(function() {
                    resolve(db);
                });
            };
            req.onerror = function() {
                resolve(null);
            };
        });
    }

    function getState(key, defaultValue) {
        return new Promise(function(resolve) {
            if (!db) {
                resolve(defaultValue);
                return;
            }
            var tx = db.transaction(STORE_STATE, 'readonly');
            var req = tx.objectStore(STORE_STATE).get(key);
            req.onsuccess = function() {
                resolve(req.result !== undefined ? req.result.value : defaultValue);
            };
            req.onerror = function() {
                resolve(defaultValue);
            };
        });
    }

    function setState(key, value) {
        return new Promise(function(resolve) {
            if (!db) {
                resolve();
                return;
            }
            var tx = db.transaction(STORE_STATE, 'readwrite');
            tx.objectStore(STORE_STATE).put({
                key: key,
                value: value
            });
            tx.oncomplete = function() {
                resolve();
            };
            tx.onerror = function() {
                resolve();
            };
        });
    }

    function seedFromJsonFile() {
        return new Promise(function(resolve) {
            if (!db) {
                resolve();
                return;
            }
            getState('seeded', false).then(function(alreadySeeded) {
                if (alreadySeeded) {
                    resolve();
                    return;
                }
                setState('seeded', true).then(function() {
                    if (typeof fetch !== 'function') {
                        resolve();
                        return;
                    }
                    fetch('orders_db.json')
                        .then(function(res) {
                            return res.ok ? res.json() : null;
                        })
                        .then(function(data) {
                            if (data && Array.isArray(data.orders) && data.orders.length !== 0) {
                                getAll().then(function(existing) {
                                    if (existing.length === 0) {
                                        replaceAll(data.orders).then(resolve);
                                    } else {
                                        resolve();
                                    }
                                });
                            } else {
                                resolve();
                            }
                        })
                        .catch(function() {
                            resolve();
                        });
                });
            });
        });
    }

    function getAll() {
        return new Promise(function(resolve) {
            if (!db) {
                resolve([]);
                return;
            }
            var tx = db.transaction(STORE_ORDERS, 'readonly');
            var req = tx.objectStore(STORE_ORDERS).getAll();
            req.onsuccess = function() {
                var list = req.result || [];
                list.sort(function(a, b) {
                    return b.createdAt - a.createdAt;
                });
                resolve(list);
            };
            req.onerror = function() {
                resolve([]);
            };
        });
    }

    function put(order) {
        return new Promise(function(resolve) {
            if (!db) {
                resolve(order);
                return;
            }
            var tx = db.transaction(STORE_ORDERS, 'readwrite');
            tx.objectStore(STORE_ORDERS).put(order);
            tx.oncomplete = function() {
                resolve(order);
            };
            tx.onerror = function() {
                resolve(order);
            };
        });
    }

    function replaceAll(ordersList) {
        return new Promise(function(resolve) {
            var cleanList = Array.isArray(ordersList) ? ordersList : [];
            if (!db) {
                resolve();
                return;
            }
            var tx = db.transaction(STORE_ORDERS, 'readwrite');
            var store = tx.objectStore(STORE_ORDERS);
            store.clear();
            cleanList.forEach(function(item) {
                store.put(item);
            });
            tx.oncomplete = function() {
                resolve();
            };
            tx.onerror = function() {
                resolve();
            };
        });
    }

    function remove(id) {
        return new Promise(function(resolve) {
            if (!db) {
                resolve();
                return;
            }
            var tx = db.transaction(STORE_ORDERS, 'readwrite');
            tx.objectStore(STORE_ORDERS).delete(id);
            tx.oncomplete = function() {
                resolve();
            };
            tx.onerror = function() {
                resolve();
            };
        });
    }

    function clear() {
        return replaceAll([]);
    }

    function exportJsonFile() {
        var payload = {
            version: 1,
            app_id: 'campus_food',
            exported_at: new Date().toISOString(),
            balance: studentBalance,
            orders: savedOrders
        };
        var jsonStr = JSON.stringify(payload, null, 2);
        var blob = new Blob([jsonStr], {
            type: 'application/json;charset=utf-8'
        });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'orders_db.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function() {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    return {
        open: open,
        getState: getState,
        setState: setState,
        getAll: getAll,
        put: put,
        replaceAll: replaceAll,
        remove: remove,
        clear: clear,
        exportJsonFile: exportJsonFile
    };
})();

var cart = {};
var studentBalance = 500;
var orderId = 101;
var savedOrders = [];
var selectedOrderId = null;

var category = 'Все';
var searchQuery = '';
var activePage = 'menu';

var $ = function(id) {
    return document.getElementById(id);
};

var count = function() {
    return Object.values(cart).reduce(function(a, b) {
        return a + b;
    }, 0);
};

var total = function() {
    return products.reduce(function(s, p) {
        return s + p.price * (cart[p.id] || 0);
    }, 0);
};

function saveAppState() {
    return Promise.all([
        LocalOrderDB.setState('cart', cart),
        LocalOrderDB.setState('balance', studentBalance),
        LocalOrderDB.setState('orderId', orderId)
    ]);
}

function updateBalancesUI() {
    ['header-shab-count', 'home-shab-balance', 'shab-balance', 'sidebar-shab-balance'].forEach(function(id) {
        if ($(id)) $(id).textContent = studentBalance;
    });
}

function updateCountersUI() {
    var c = count();
    var t = total();

    if ($('head-count')) $('head-count').textContent = c;
    if ($('sidebar-count')) {
        var w = c === 1 ? 'шт.' : 'шт.';
        $('sidebar-count').textContent = c + ' ' + w;
    }
    if ($('nav-dot')) $('nav-dot').style.display = c ? 'block' : 'none';
    if ($('fc-count')) $('fc-count').textContent = c;
    if ($('fc-total')) $('fc-total').textContent = t + ' ₽';

    var bar = $('floating-cart') || document.querySelector('.floating-cart');
    if (bar) {
        if (c > 0 && activePage === 'menu' && window.innerWidth < 960) {
            bar.classList.add('visible');
            bar.style.display = 'flex';
        } else {
            bar.classList.remove('visible');
            bar.style.display = 'none';
        }
    }
}

// Отрисовка каталога блюд (как на макете Figma)
function renderProducts() {
    var container = $('products') || document.querySelector('.product-grid');
    if (!container) return;

    var filtered = products.filter(function(p) {
        var matchCat = category === 'Все' || p.category === category || category.indexOf(p.category) !== -1;
        var matchSearch = !searchQuery ||
            p.name.toLowerCase().indexOf(searchQuery) !== -1 ||
            p.desc.toLowerCase().indexOf(searchQuery) !== -1;
        return matchCat && matchSearch;
    });

    if ($('items-found')) {
        var word = filtered.length === 1 ? 'блюдо' : (filtered.length >= 2 && filtered.length <= 4 ? 'блюда' : 'блюд');
        $('items-found').textContent = filtered.length + ' ' + word;
    }

    if (!filtered.length) {
        container.innerHTML = tag('div', 'class="empty-state" style="grid-column: 1 / -1;"',
            tag('h3', '', 'Ничего не найдено') +
            tag('p', '', 'Попробуйте изменить поисковый запрос или категорию.')
        );
        return;
    }

    container.innerHTML = filtered.map(function(p, idx) {
        var qty = cart[p.id] || 0;
        var controlHtml = qty > 0 ?
            tag('div', 'class="inline-stepper"',
                tag('button', 'data-dec="' + p.id + '" type="button"', '−') +
                tag('span', 'class="num"', String(qty)) +
                tag('button', 'data-add="' + p.id + '" type="button"', '+')
            ) :
            tag('button', 'class="btn-add-item" data-add="' + p.id + '" type="button"', '+ В заказ');

        var badgeHtml = p.badge ?
            tag('span', 'class="product-hit-badge"', '🔥 ' + p.badge) :
            '';

        var weightHtml = p.weight ?
            tag('span', 'class="product-weight-badge num"', p.weight) :
            '';
        return tag('article', 'class="product" data-product-card="' + p.id + '" style="animation-delay: ' + (idx * 35) + 'ms"',
            tag('div', '',
                tag('div', 'class="product-thumb"',
                    badgeHtml +
                    tag('span', 'class="product-emoji"', p.emoji) +
                    weightHtml
                ) +
                tag('div', 'class="product-cat-label"', p.category) +
                tag('h3', '', p.name) +
                tag('p', 'class="desc"', p.desc + (p.weight ? ' · ' + p.weight : ''))
            ) +
            tag('div', 'class="price-row"',
                tag('span', 'class="price num"', p.price + ' ₽') +
                tag('div', 'class="product-actions"', controlHtml)
            )
        );
    }).join('');
}
// Обновляет только счётчик конкретной карточки, не перерисовывая весь каталог.
function updateProductControl(productId) {
    var product = products.find(function(p) { return p.id === productId; });
    var card = document.querySelector('[data-product-card="' + productId + '"]');
    var actions = card && card.querySelector('.product-actions');
    if (!product || !actions) return;

    var qty = cart[productId] || 0;
    actions.innerHTML = qty > 0 ?
        tag('div', 'class="inline-stepper"',
            tag('button', 'data-dec="' + productId + '" type="button"', '−') +
            tag('span', 'class="num"', String(qty)) +
            tag('button', 'data-add="' + productId + '" type="button"', '+')
        ) :
        tag('button', 'class="btn-add-item" data-add="' + productId + '" type="button"', '+ В заказ');
}

// Генерация строк корзины (переиспользуется для отдельной страницы и правого сайдбара)
function buildCartRowsHtml(items) {
    return items.map(function(p) {
        return tag('div', 'class="cart-row"',
            tag('div', 'class="cart-thumb"', p.emoji) +
            tag('div', 'class="cart-info"',
                tag('b', '', p.name) +
                tag('small', 'class="num"', p.price + ' ₽')
            ) +
            tag('div', 'class="qty-control"',
                tag('button', 'data-dec="' + p.id + '" type="button"', '−') +
                tag('b', 'class="num"', String(cart[p.id])) +
                tag('button', 'data-add="' + p.id + '" type="button"', '+')
            )
        );
    }).join('');
}
// Отрисовка страницы корзины и правого блока «Твой заказ»
function renderCart() {
    var items = products.filter(function(p) {
        return cart[p.id];
    });
    updateCountersUI();
    // 1. Правый сайдбар «Твой заказ» на главной (как на скрине Figma)
    var sidebarItems = $('sidebar-cart-items');
    var sidebarFooter = $('sidebar-cart-footer');
    if (sidebarItems) {
        if (!items.length) {
            sidebarItems.innerHTML = tag('div', 'class="sidebar-empty"',
                tag('p', 'style="margin:0; font-size:13px; color:var(--text-muted); text-align:center; padding:20px 0;"',
                    'Добавьте блюда из меню слева, чтобы собрать заказ к перемене.'
                )
            );
            if (sidebarFooter) sidebarFooter.style.display = 'none';
        } else {
            sidebarItems.innerHTML = buildCartRowsHtml(items);
            if (sidebarFooter) sidebarFooter.style.display = 'block';
        }
    }
    // 2. Отдельная вкладка «Корзина»
    var container = $('cart-content');
    if (!container) return;
    if (!items.length) {
        var svgIcon = tag('svg', 'width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"',
            voidTag('circle', 'cx="8" cy="21" r="1"') +
            voidTag('circle', 'cx="19" cy="21" r="1"') +
            voidTag('path', 'd="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"')
        );
        container.innerHTML = tag('div', 'class="empty-state"',
            tag('div', 'class="empty-icon"', svgIcon) +
            tag('h3', '', 'Корзина пуста') +
            tag('p', '', 'Добавьте блюда из каталога, чтобы оформить предзаказ.') +
            tag('button', 'class="btn-primary" data-page="menu" type="button"', 'Перейти в каталог')
        );
        return;
    }
    container.innerHTML = tag('div', 'class="card-panel"',
        buildCartRowsHtml(items) +
        tag('div', 'class="cart-summary"',
            tag('span', '', 'Итого') +
            tag('span', 'class="num"', total() + ' ₽')
        ) +
        tag('div', 'class="actions-stack" style="margin-top:16px;"',
            tag('button', 'class="btn-primary full" data-page="checkout" type="button"', 'Продолжить оформление') +
            tag('button', 'class="btn-ghost full" data-page="menu" type="button"', 'Добавить ещё блюда')
        )
    );
}

function updatePaymentScreen() {
    var subtotal = total();
    var maxAllowed = Math.min(studentBalance, Math.floor(subtotal * 0.3));
    var toggle = $('use-shab-toggle') || $('sidebar-shab-toggle');
    var useBonus = toggle ? toggle.checked && maxAllowed > 0 : false;
    var discount = useBonus ? maxAllowed : 0;
    var finalPay = subtotal - discount;
    updateBalancesUI();
    if ($('payment-subtotal')) $('payment-subtotal').textContent = subtotal + ' ₽';
    if ($('sidebar-subtotal')) $('sidebar-subtotal').textContent = subtotal + ' ₽';
    if ($('max-shab-pay')) $('max-shab-pay').textContent = maxAllowed;
    if ($('shab-discount-rub')) $('shab-discount-rub').textContent = maxAllowed;
    if ($('receipt-discount')) $('receipt-discount').textContent = '−' + discount + ' ₽';
    if ($('sidebar-discount')) $('sidebar-discount').textContent = '−' + discount + ' ₽';
    if ($('receipt-discount-row')) $('receipt-discount-row').style.opacity = useBonus ? '1' : '0.45';
    if ($('shab-calc-note')) {
        $('shab-calc-note').textContent = useBonus ?
            'Будет списано ' + discount + ' баллов (−' + discount + ' ₽)' :
            'Списание баллов отключено — оплата 100% картой';
    }
    if ($('payment-total')) $('payment-total').textContent = finalPay + ' ₽';
    if ($('sidebar-total')) $('sidebar-total').textContent = finalPay + ' ₽';
    if ($('btn-pay-amount')) $('btn-pay-amount').textContent = finalPay + ' ₽';
}

function syncTimelineUI(order) {
    var steps = document.querySelectorAll('#page-status .timeline .step, .timeline .step');
    var orderSteps = ['Принят', 'Готовится', 'Курьер в пути', 'Доставлен'];
    var activeIdx = order ? Math.max(0, orderSteps.indexOf(order.status)) : 0;
    steps.forEach(function(stepEl, idx) {
        stepEl.classList.remove('done', 'active');
        if (!order) return;
        if (idx === activeIdx) {
            stepEl.classList.add(activeIdx === 3 ? 'done' : 'active');
        } else if (idx < activeIdx) {
            stepEl.classList.add('done');
        }
    });
}

// Автоматическое продвижение заказа: каждая минута — следующий этап.
// Привязка к createdAt сохраняет прогресс даже после закрытия приложения.
function advanceOrderStatuses() {
    var stages = ['Принят', 'Готовится', 'Курьер в пути', 'Доставлен'];
    var changed = false;
    var now = Date.now();

    savedOrders.forEach(function(order) {
        if (!order || !order.createdAt || order.status === 'Отменён') return;
        var elapsedMinutes = Math.floor(Math.max(0, now - Number(order.createdAt)) / 60000);
        var nextIndex = Math.min(3, elapsedMinutes);
        var currentIndex = stages.indexOf(order.status);
        if (currentIndex < 0) currentIndex = 0;

        // Не откатываем уже достигнутый этап, но автоматически доводим заказ до доставки.
        if (nextIndex > currentIndex) {
            order.status = stages[nextIndex];
            changed = true;
            LocalOrderDB.put(order);
        }
    });

    if (changed) renderStatusAndSavedOrders();
}

function renderStatusAndSavedOrders() {
    var statusPage = $('page-status');
    if (!statusPage) return;
    var firstOrder = savedOrders.length > 0 ? savedOrders[0] : null;
    var activeOrder = savedOrders.find(function(o) {
        return o.id === selectedOrderId;
    }) || firstOrder;
    if (activeOrder) {
        selectedOrderId = activeOrder.id;
        if ($('order-number')) $('order-number').textContent = activeOrder.id;
        var payText = activeOrder.bonusSpent > 0 ?
            'оплачено ' + activeOrder.cardPaid + ' ₽ картой + ' + activeOrder.bonusSpent + ' баллов' :
            'оплачено ' + activeOrder.cardPaid + ' ₽ картой';
        if ($('order-description')) {
            $('order-description').textContent = activeOrder.building + ', ' + activeOrder.room + ' · ' + activeOrder.delivery + ' (' + payText + ').';
        }
        syncTimelineUI(activeOrder);
    } else {
        if ($('order-number')) $('order-number').textContent = orderId;
        if ($('order-description')) {
            $('order-description').textContent = 'Активных заказов в локальной базе пока нет. Оформите заказ из меню.';
        }
        syncTimelineUI(null);
    }
    var historyBlock = $('saved-orders-db-section');
    if (!historyBlock) {
        historyBlock = document.createElement('div');
        historyBlock.id = 'saved-orders-db-section';
        historyBlock.style.marginTop = '16px';
        statusPage.appendChild(historyBlock);
    }
    var jsonToolbarHtml = tag('div', 'style="display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; padding-top:12px; border-top:1px solid var(--border);"',
        tag('button', 'class="btn-ghost" type="button" data-export-json style="height:34px; padding:0 12px; font-size:12px;"', 'Скачать orders_db.json') +
        tag('label', 'class="btn-ghost" style="height:34px; padding:0 12px; font-size:12px; display:inline-flex; align-items:center; cursor:pointer;"',
            'Загрузить JSON' +
            voidTag('input', 'type="file" id="import-json-input" accept=".json,application/json" style="display:none;"')
        )
    );
    if (!savedOrders.length) {
        historyBlock.innerHTML = tag('div', 'class="card-panel"',
            tag('div', 'class="section-bar" style="margin-bottom:6px;"',
                tag('h2', '', 'История заказов (IndexedDB)') +
                tag('span', 'class="muted-count num"', '0 записей')
            ) +
            tag('p', 'style="margin:0; font-size:13px; color:var(--text-secondary);"',
                'Заказы сохраняются локально в IndexedDB и не пропадают после перезапуска приложения.'
            ) +
            jsonToolbarHtml
        );
        return;
    }
    var statuses = ['Принят', 'Готовится', 'Курьер в пути', 'Доставлен'];
    var ordersHtml = savedOrders.map(function(ord) {
        var isSelected = ord.id === selectedOrderId;
        var dateLabel = new Date(ord.createdAt).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        var itemsSummary = ord.items.map(function(i) {
            return i.name + ' ×' + i.qty;
        }).join(', ');
        var selectedStyle = isSelected ?
            'background:var(--accent-soft); padding:12px; border-radius:var(--radius-sm); border:1px solid var(--accent-border); margin-bottom:8px;' :
            '';
        var optionsHtml = statuses.map(function(st) {
            return tag('option', 'value="' + st + '"' + (ord.status === st ? ' selected' : ''), st);
        }).join('');
        var bonusNote = ord.bonusSpent > 0 ? ' (−' + ord.bonusSpent + ' б.)' : '';
        return tag('div', 'class="cart-row" style="flex-direction:column; align-items:stretch; gap:8px; ' + selectedStyle + '"',
            tag('div', 'style="display:flex; justify-content:space-between; align-items:center; gap:8px;"',
                tag('div', '',
                    tag('b', 'class="num"', 'Заказ № ' + ord.id) +
                    tag('small', 'style="display:block; color:var(--text-muted);"', dateLabel + ' · ' + ord.building + ', ' + ord.room + ' (' + ord.delivery + ')')
                ) +
                tag('span', 'class="badge-blue num"', ord.status)
            ) +
            tag('div', 'style="font-size:12px; color:var(--text-secondary);"', itemsSummary) +
            tag('div', 'style="display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; margin-top:2px;"',
                tag('span', 'class="price num" style="font-size:14px;"', ord.subtotal + ' ₽' + bonusNote) +
                tag('div', 'style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;"',
                    tag('select', 'data-order-status="' + ord.id + '" style="height:32px; padding:0 8px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:12px;"', optionsHtml) +
                    tag('button', 'class="btn-ghost" type="button" data-select-order="' + ord.id + '" style="height:32px; padding:0 10px; font-size:12px;"', isSelected ? 'Выбран' : 'Открыть') +
                    tag('button', 'class="btn-ghost" type="button" data-delete-order="' + ord.id + '" style="height:32px; padding:0 10px; font-size:12px; color:#dc2626; border-color:rgba(220,38,38,0.35);"', 'Удалить')
                )
            )
        );
    }).join('');
    historyBlock.innerHTML = tag('div', 'class="card-panel"',
        tag('div', 'class="section-bar" style="margin-bottom:12px;"',
            tag('h2', '', 'Сохранённые заказы') +
            tag('button', 'class="btn-ghost" type="button" data-clear-orders style="height:32px; padding:0 10px; font-size:12px;"', 'Очистить всё (' + savedOrders.length + ')')
        ) +
        ordersHtml +
        jsonToolbarHtml
    );
}

function showPage(name) {
    activePage = name;
    document.querySelectorAll('.page').forEach(function(x) {
        x.classList.remove('active');
        if (x.id === 'page-' + name) {
            void x.offsetWidth;
            x.classList.add('active');
        }
    });
    document.querySelectorAll('.nav-item, .nav-tab').forEach(function(x) {
        x.classList.toggle('active', x.dataset.page === name);
    });
    if (name === 'menu') {
        renderProducts();
        renderCart();
        updatePaymentScreen();
    }
    if (name === 'cart') renderCart();
    if (name === 'payment') updatePaymentScreen();
    if (name === 'status') renderStatusAndSavedOrders();
    updateCountersUI();
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function submitOrder(sourcePrefix) {
    if (!count()) {
        alert('Корзина пуста.');
        return;
    }
    var buildingEl = $(sourcePrefix + 'building') || $('building');
    var roomEl = $(sourcePrefix + 'room') || $('room');
    var deliveryEl = $(sourcePrefix + 'delivery') || $('delivery');
    var toggleEl = $(sourcePrefix + 'use-shab-toggle') || $('use-shab-toggle');
    if (roomEl && !roomEl.value.trim()) {
        alert('Укажите номер аудитории или точку выдачи.');
        roomEl.focus();
        return;
    }
    var subtotal = total();
    var maxAllowed = Math.min(studentBalance, Math.floor(subtotal * 0.3));
    var useBonus = toggleEl ? toggleEl.checked && maxAllowed > 0 : false;
    var bonusSpent = useBonus ? maxAllowed : 0;
    var cardPaid = subtotal - bonusSpent;
    if (bonusSpent > 0) {
        studentBalance -= bonusSpent;
    }
    var orderItems = products
        .filter(function(p) {
            return cart[p.id];
        })
        .map(function(p) {
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                qty: cart[p.id]
            };
        });
    var currentOrderNumber = orderId;
    orderId++;
    var newOrder = {
        id: currentOrderNumber,
        items: orderItems,
        subtotal: subtotal,
        bonusSpent: bonusSpent,
        cardPaid: cardPaid,
        building: buildingEl ? buildingEl.value : 'Главный корпус',
        room: roomEl ? roomEl.value.trim() : '',
        delivery: deliveryEl ? deliveryEl.value : 'К 12:00 — большая перемена',
        status: 'Принят',
        createdAt: Date.now()
    };
    cart = {};
    saveAppState();
    updateBalancesUI();
    renderProducts();
    renderCart();
    updatePaymentScreen();
    LocalOrderDB.put(newOrder).then(function() {
        return LocalOrderDB.getAll();
    }).then(function(list) {
        savedOrders = list;
        selectedOrderId = newOrder.id;
        showPage('status');
    });
}

function bumpCart() {
    var btn = document.querySelector('.cart-btn');
    if (!btn) return;
    btn.classList.remove('bump');
    void btn.offsetWidth;
    btn.classList.add('bump');
}
document.addEventListener('click', function(e) {
    var add = e.target.closest('[data-add]');
    if (add) {
        var id = Number(add.dataset.add);
        cart[id] = (cart[id] || 0) + 1;
        saveAppState();
        updateProductControl(id);
        renderCart();
        updatePaymentScreen();
        bumpCart();
        return;
    }
    var dec = e.target.closest('[data-dec]');
    if (dec) {
        var idDec = Number(dec.dataset.dec);
        cart[idDec] = (cart[idDec] || 0) - 1;
        if (cart[idDec] <= 0) delete cart[idDec];
        saveAppState();
        updateProductControl(idDec);
        renderCart();
        updatePaymentScreen();
        return;
    }
    var page = e.target.closest('[data-page]');
    if (page) {
        showPage(page.dataset.page);
        return;
    }
    var cat = e.target.closest('[data-category], .chip');
    if (cat && (cat.dataset.category || cat.classList.contains('chip'))) {
        category = cat.dataset.category || cat.textContent.trim();
        document.querySelectorAll('.chip').forEach(function(x) {
            x.classList.toggle('selected', x === cat);
            x.classList.toggle('active', x === cat);
        });
        renderProducts();
        return;
    }
    var selOrder = e.target.closest('[data-select-order]');
    if (selOrder) {
        selectedOrderId = Number(selOrder.dataset.selectOrder);
        renderStatusAndSavedOrders();
        return;
    }
    var delOrder = e.target.closest('[data-delete-order]');
    if (delOrder) {
        var idToDelete = Number(delOrder.dataset.deleteOrder);
        var target = savedOrders.find(function(o) {
            return o.id === idToDelete;
        });
        LocalOrderDB.remove(idToDelete).then(function() {
            if (target && target.bonusSpent > 0 && target.status !== 'Доставлен') {
                studentBalance = Math.min(500, studentBalance + target.bonusSpent);
                saveAppState();
                updateBalancesUI();
            }
            return LocalOrderDB.getAll();
        }).then(function(list) {
            savedOrders = list;
            if (selectedOrderId === idToDelete) {
                selectedOrderId = savedOrders.length > 0 ? savedOrders[0].id : null;
            }
            renderStatusAndSavedOrders();
        });
        return;
    }
    var clearBtn = e.target.closest('[data-clear-orders]');
    if (clearBtn) {
        LocalOrderDB.clear().then(function() {
            savedOrders = [];
            selectedOrderId = null;
            renderStatusAndSavedOrders();
        });
        return;
    }
    var exportBtn = e.target.closest('[data-export-json]');
    if (exportBtn) {
        LocalOrderDB.exportJsonFile();
    }
});
document.addEventListener('change', function(e) {
    var statusSelect = e.target.closest('[data-order-status]');
    if (statusSelect) {
        var idToUpdate = Number(statusSelect.dataset.orderStatus);
        var newStatus = statusSelect.value;
        var target = savedOrders.find(function(o) {
            return o.id === idToUpdate;
        });
        if (!target) return;
        target.status = newStatus;
        LocalOrderDB.put(target).then(function() {
            return LocalOrderDB.getAll();
        }).then(function(list) {
            savedOrders = list;
            renderStatusAndSavedOrders();
        });
        return;
    }
    if (e.target && e.target.id === 'import-json-input') {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
            try {
                var parsed = JSON.parse(ev.target.result);
                var importedOrders = Array.isArray(parsed) ? parsed : (parsed.orders || []);
                LocalOrderDB.replaceAll(importedOrders).then(function() {
                    return LocalOrderDB.getAll();
                }).then(function(list) {
                    savedOrders = list;
                    selectedOrderId = savedOrders.length > 0 ? savedOrders[0].id : null;
                    renderStatusAndSavedOrders();
                });
            } catch (err) {
                alert('Некорректный JSON-файл.');
            }
        };
        reader.readAsText(file);
    }
});
var searchEl = $('search-input') || document.querySelector('.search-box input');
if (searchEl) {
    searchEl.addEventListener('input', function(e) {
        searchQuery = e.target.value.trim().toLowerCase();
        renderProducts();
    });
}
if ($('use-shab-toggle')) {
    $('use-shab-toggle').addEventListener('change', updatePaymentScreen);
}
if ($('sidebar-shab-toggle')) {
    $('sidebar-shab-toggle').addEventListener('change', function(e) {
        if ($('use-shab-toggle')) $('use-shab-toggle').checked = e.target.checked;
        updatePaymentScreen();
    });
}
if ($('to-payment')) {
    $('to-payment').addEventListener('click', function() {
        if ($('room') && !$('room').value.trim()) {
            alert('Укажите аудиторию или точку выдачи.');
            $('room').focus();
            return;
        }
        showPage('payment');
    });
}
if ($('pay-confirm')) {
    $('pay-confirm').addEventListener('click', function() {
        submitOrder('');
    });
}
if ($('sidebar-pay-confirm')) {
    $('sidebar-pay-confirm').addEventListener('click', function() {
        submitOrder('sidebar-');
    });
}
if ($('new-order')) {
    $('new-order').addEventListener('click', function() {
        showPage('menu');
    });
}
var toggleModal = function(open) {
    var modal = $('shab-modal');
    if (modal) {
        modal.classList.toggle('open', open);
        modal.setAttribute('aria-hidden', String(!open));
    }
};
if ($('open-shab-info')) $('open-shab-info').addEventListener('click', function() {
    toggleModal(true);
});
if ($('hero-wallet-card')) $('hero-wallet-card').addEventListener('click', function() {
    toggleModal(true);
});
if ($('close-shab-modal')) $('close-shab-modal').addEventListener('click', function() {
    toggleModal(false);
});
if ($('shab-modal')) {
    $('shab-modal').addEventListener('click', function(e) {
        if (e.target === $('shab-modal')) toggleModal(false);
    });
}
// Первичная отрисовка + загрузка данных из IndexedDB
renderProducts();
renderCart();
updateBalancesUI();
updatePaymentScreen();
LocalOrderDB.open().then(function() {
    return Promise.all([
        LocalOrderDB.getAll(),
        LocalOrderDB.getState('cart', {}),
        LocalOrderDB.getState('balance', 500),
        LocalOrderDB.getState('orderId', 101)
    ]);
}).then(function(results) {
    savedOrders = results[0] || [];
    cart = results[1] || {};
    studentBalance = results[2] !== undefined ? Number(results[2]) : 500;
    orderId = results[3] !== undefined ? Number(results[3]) : 101;
    if (savedOrders.length > 0) {
        selectedOrderId = savedOrders[0].id;
        var maxSavedId = Math.max.apply(null, savedOrders.map(function(o) {
            return Number(o.id) || 0;
        }));
        if (maxSavedId >= orderId) {
            orderId = maxSavedId + 1;
            saveAppState();
        }
    }
    renderProducts();
    renderCart();
    updateBalancesUI();
    updatePaymentScreen();
    renderStatusAndSavedOrders();
    advanceOrderStatuses();
    // Сверяем этапы с прошедшим временем, в том числе после возврата в приложение.
    setInterval(advanceOrderStatuses, 1000);
});