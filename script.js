// =========================================
// 1. IMPORT & INISIALISASI FIREBASE SDK (100% PAKET GRATIS SPARK)
// =========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAfUEk1G_noUjtd1MinSxNKdg5T57GcoXE",
    authDomain: "fiohakim-portofolio.firebaseapp.com",
    projectId: "fiohakim-portofolio",
    storageBucket: "fiohakim-portofolio.firebasestorage.app",
    messagingSenderId: "320478750884",
    appId: "1:320478750884:web:a401db78cb2b52bb2f1e31",
    measurementId: "G-7FXS8PH2F4"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence);
const portfolioDocRef = doc(db, "portfolio", "mainData");

let projectSubmenus = [
    { id: "sem-1", label: "Semester 1" },
    { id: "sem-2", label: "Semester 2" },
    { id: "sem-3", label: "Semester 3" }
];

let contactLinks = {
    waLink: "https://wa.me/6281234567890",
    ytLink: "https://www.youtube.com",
    ttLink: "https://www.tiktok.com"
};

let extraSidebarItems = [];
let extraSkills = [];
let showcaseProjects = [];
let savedIcons = {};
let deletedStaticCards = [];
let deletedTextKeys = [];

let activePage = 'home';
let activeSemesterId = 'sem-1';
let activeCategoryFilter = 'all';
let isEditingMode = false;
let currentUser = null;
let isInitialCloudLoaded = false;

// =========================================
// 2. RIPPLE CLICK, SCROLL-REVEAL, PARALLAX & SKELETON
// =========================================
document.addEventListener('click', (e) => {
    const target = e.target.closest('.ripple-trigger');
    if (!target) return;

    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'ripple-wave';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;

    target.appendChild(ripple);
    setTimeout(() => ripple.remove(), 580);
});

const scrollRevealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, idx) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.classList.add('revealed');
            }, idx * 45);
            scrollRevealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.06 });

function observeScrollRevealElements() {
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        if (!el.classList.contains('revealed')) {
            scrollRevealObserver.observe(el);
        }
    });
}

let parallaxTicking = false;
window.addEventListener('scroll', () => {
    if (parallaxTicking) return;
    parallaxTicking = true;
    requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        const orbs = document.getElementById('parallaxOrbs');
        const profileBox = document.getElementById('heroProfileParallax');

        if (orbs) {
            orbs.style.transform = `translate3d(0, ${(scrollY * 0.14).toFixed(1)}px, 0)`;
        }
        if (profileBox && window.innerWidth > 900) {
            profileBox.style.transform = `translate3d(0, ${(scrollY * -0.06).toFixed(1)}px, 0)`;
        }
        parallaxTicking = false;
    });
}, { passive: true });

const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

function showProjectsSkeleton(show) {
    const skel = document.getElementById('projectsSkeletonGrid');
    const grid = document.getElementById('projectsGrid');
    if (!skel || !grid) return;

    if (show) {
        skel.classList.remove('hidden');
        grid.classList.add('hidden');
    } else {
        skel.classList.add('hidden');
        grid.classList.remove('hidden');
    }
}

// =========================================
// 3. SISTEM MULTI-HALAMAN (TRANSISI MULUS BEBAS KEDUT)
// =========================================
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');

function closeMobileSidebar() {
    sidebar.classList.remove('open');
    sidebarBackdrop.classList.remove('active');
}

document.getElementById('openSidebarBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
    sidebarBackdrop.classList.add('active');
});

document.getElementById('closeSidebarBtn').addEventListener('click', closeMobileSidebar);
sidebarBackdrop.addEventListener('click', closeMobileSidebar);

const projectAccordionGroup = document.getElementById('projectAccordionGroup');
document.getElementById('toggleProjectMenuBtn').addEventListener('click', () => {
    projectAccordionGroup.classList.toggle('open');
});

function switchPage(pageName, semesterId = null) {
    if (activePage === pageName && (!semesterId || activeSemesterId === semesterId)) {
        closeMobileSidebar();
        return;
    }

    activePage = pageName;

    if (window.scrollY > 0) {
        window.scrollTo({ top: 0, behavior: 'instant' });
    }

    document.querySelectorAll('.page-view').forEach(sec => sec.classList.remove('active'));
    const targetSection = document.getElementById(`page-${pageName}`);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    document.querySelectorAll('.sidebar-links a.nav-item, .submenu-link').forEach(el => {
        el.classList.remove('active');
    });

    if (pageName === 'projects') {
        if (semesterId) activeSemesterId = semesterId;
        projectAccordionGroup.classList.add('open');

        const activeSub = projectSubmenus.find(s => s.id === activeSemesterId) || projectSubmenus[0];
        if (activeSub) {
            activeSemesterId = activeSub.id;
            document.getElementById('projectBreadcrumbSemester').textContent = activeSub.label;
            document.getElementById('projectPageMainTitle').innerHTML = `Tugas Projek — <span>${activeSub.label}</span>`;
            document.getElementById('mobilePageTitle').textContent = activeSub.label;

            const subLink = document.querySelector(`.submenu-link[data-sem-id="${activeSub.id}"]`);
            if (subLink) subLink.classList.add('active');
        }

        activeCategoryFilter = 'all';
        if (!isInitialCloudLoaded) {
            showProjectsSkeleton(true);
        } else {
            showProjectsSkeleton(false);
            renderProjectsForActiveSemester();
        }
    } else {
        const navLink = document.querySelector(`.sidebar-links a.nav-item[data-page="${pageName}"]`);
        if (navLink) {
            navLink.classList.add('active');
            document.getElementById('mobilePageTitle').textContent = navLink.textContent.trim();
        }
    }

    observeScrollRevealElements();
    closeMobileSidebar();
}

document.querySelectorAll('.sidebar-links a.nav-item[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        switchPage(page);
    });
});

document.getElementById('heroExploreProjectsBtn').addEventListener('click', () => {
    const firstSem = projectSubmenus[0] ? projectSubmenus[0].id : 'sem-1';
    switchPage('projects', firstSem);
});

document.getElementById('statTotalProjectsBox').addEventListener('click', () => {
    const firstSem = projectSubmenus[0] ? projectSubmenus[0].id : 'sem-1';
    switchPage('projects', firstSem);
});

document.querySelectorAll('[data-goto-page]').forEach(el => {
    el.addEventListener('click', () => {
        switchPage(el.getAttribute('data-goto-page'));
    });
});

function syncContactLinksToUI() {
    Object.keys(contactLinks).forEach(key => {
        const inputEl = document.querySelector(`.link-sync-input[data-link-key="${key}"]`);
        const anchorEl = document.querySelector(`a[data-link-target="${key}"]`);
        if (inputEl) inputEl.value = contactLinks[key];
        if (anchorEl) anchorEl.href = contactLinks[key] || '#';
    });
}

document.querySelectorAll('.link-sync-input').forEach(input => {
    input.addEventListener('input', () => {
        const key = input.getAttribute('data-link-key');
        const val = input.value.trim();
        contactLinks[key] = val;
        const anchorEl = document.querySelector(`a[data-link-target="${key}"]`);
        if (anchorEl) anchorEl.href = val || '#';
    });
});

function animateCounter(el, targetValue) {
    if (!el) return;
    const startVal = parseInt(el.textContent) || 0;
    if (startVal === targetValue) return;
    const duration = 450;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(startVal + (targetValue - startVal) * eased);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

function renderProjectSubmenus() {
    const submenuList = document.getElementById('projectSubmenuList');
    const semesterSelect = document.getElementById('projSemesterSelect');
    submenuList.innerHTML = '';
    semesterSelect.innerHTML = '';

    projectSubmenus.forEach((sub, index) => {
        const count = showcaseProjects.filter(p => (p.semesterId || 'sem-1') === sub.id).length;

        const li = document.createElement('li');
        li.className = 'submenu-item-row';
        li.innerHTML = `
            <a href="#projects-${sub.id}" class="submenu-link ios-squish ${activePage === 'projects' && activeSemesterId === sub.id ? 'active' : ''}" data-sem-id="${sub.id}">
                <span class="editable submenu-label-text" data-sub-index="${index}">${sub.label}</span>
                <span class="submenu-count">${count}</span>
            </a>
            ${projectSubmenus.length > 1 ? `<button type="button" class="edit-only-box delete-submenu-btn ios-squish" data-sub-index="${index}" title="Hapus Sub-Menu">&times;</button>` : ''}
        `;
        submenuList.appendChild(li);

        const opt = document.createElement('option');
        opt.value = sub.id;
        opt.textContent = sub.label;
        semesterSelect.appendChild(opt);
    });

    submenuList.querySelectorAll('.submenu-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (isEditingMode && e.target.classList.contains('editable')) return;
            const semId = link.getAttribute('data-sem-id');
            switchPage('projects', semId);
        });
    });

    submenuList.querySelectorAll('.submenu-label-text').forEach(el => {
        el.addEventListener('input', () => {
            const idx = parseInt(el.getAttribute('data-sub-index'));
            projectSubmenus[idx].label = el.textContent.trim() || `Semester ${idx + 1}`;
        });
    });

    submenuList.querySelectorAll('.delete-submenu-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const idx = parseInt(btn.getAttribute('data-sub-index'));
            if (confirm(`Hapus folder "${projectSubmenus[idx].label}"?`)) {
                projectSubmenus.splice(idx, 1);
                if (!projectSubmenus.find(s => s.id === activeSemesterId)) {
                    activeSemesterId = projectSubmenus[0].id;
                }
                renderProjectSubmenus();
                saveAllToCloud(true);
            }
        });
    });

    animateCounter(document.getElementById('homeTotalProjects'), showcaseProjects.length);
    animateCounter(document.getElementById('homeTotalSemesters'), projectSubmenus.length);
}

document.getElementById('addSubmenuBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('addSubmenuModal').style.display = 'flex';
});

document.getElementById('confirmAddSubmenuBtn').addEventListener('click', () => {
    const label = document.getElementById('newSubmenuLabel').value.trim();
    if (!label) return alert("Nama sub-menu tidak boleh kosong!");

    const newId = `sem-${Date.now()}`;
    projectSubmenus.push({ id: newId, label });
    document.getElementById('newSubmenuLabel').value = '';
    document.getElementById('addSubmenuModal').style.display = 'none';

    renderProjectSubmenus();
    saveAllToCloud(true);
    switchPage('projects', newId);
});

// =========================================
// 4. KONTROL HAPUS SEMUA TEKS SAAT MODE EDIT
// =========================================
function attachTextDeleteControls() {
    document.querySelectorAll('.editable').forEach(el => {
        if (el.classList.contains('submenu-label-text')) return;
        if (el.parentElement && el.parentElement.classList.contains('editable-wrapper')) return;

        const wrapper = document.createElement('span');
        wrapper.className = 'editable-wrapper';
        el.parentNode.insertBefore(wrapper, el);
        wrapper.appendChild(el);

        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'delete-text-btn';
        delBtn.innerHTML = '&times;';
        delBtn.title = 'Hapus teks ini';

        delBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            el.innerHTML = '';
            const key = el.getAttribute('data-key');
            if (key && !deletedTextKeys.includes(key)) {
                deletedTextKeys.push(key);
            }

            if (el.classList.contains('dynamic-field')) {
                const idx = parseInt(el.getAttribute('data-index'));
                const field = el.getAttribute('data-field');
                if (extraSkills[idx]) extraSkills[idx][field] = '';
            } else if (el.classList.contains('dynamic-proj-field')) {
                const realIdx = parseInt(el.getAttribute('data-real-index'));
                const field = el.getAttribute('data-field');
                if (showcaseProjects[realIdx]) showcaseProjects[realIdx][field] = '';
            }

            wrapper.style.display = 'none';
            saveAllToCloud(true);
        });

        wrapper.appendChild(delBtn);
    });
}

// =========================================
// 5. PARSER VIDEO YOUTUBE & TIKTOK
// =========================================
function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function extractTikTokId(url) {
    if (!url) return null;
    const match = url.match(/video\/(\d+)/);
    return match ? match[1] : null;
}

// =========================================
// 6. PEMILIH IKON (ICON PICKER)
// =========================================
const ICON_OPTIONS = [
    "fas fa-network-wired", "fas fa-server", "fas fa-router", "fas fa-wifi",
    "fas fa-shield-alt", "fas fa-terminal", "fas fa-microchip", "fas fa-wave-square",
    "fas fa-play-circle", "fab fa-youtube", "fab fa-tiktok", "fas fa-video",
    "fas fa-cloud", "fas fa-database", "fas fa-lock", "fas fa-code",
    "fas fa-laptop-code", "fas fa-desktop", "fas fa-hdd", "fas fa-memory",
    "fas fa-tools", "fas fa-cogs", "fas fa-project-diagram", "fas fa-sitemap",
    "fas fa-certificate", "fas fa-award", "fas fa-star", "fas fa-graduation-cap",
    "fas fa-folder-open", "fas fa-home", "fas fa-user-astronaut", "fas fa-envelope"
];

let activeIconTarget = null;

function initIconPicker() {
    const grid = document.getElementById('iconGridPicker');
    grid.innerHTML = '';

    ICON_OPTIONS.forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option-btn ios-squish';
        btn.innerHTML = `<i class="${iconClass}"></i>`;

        btn.addEventListener('click', () => {
            if (!activeIconTarget) return;

            if (activeIconTarget.type === 'static') {
                const key = activeIconTarget.key;
                savedIcons[key] = iconClass;
                const iconEl = document.querySelector(`.editable-icon[data-icon-key="${key}"]`);
                if (iconEl) iconEl.className = `${iconClass} editable-icon`;
            } else if (activeIconTarget.type === 'dynamic') {
                const { arrName, index } = activeIconTarget;
                if (arrName === 'extraSkills') extraSkills[index].icon = iconClass;
                if (arrName === 'extraSidebarItems') extraSidebarItems[index].icon = iconClass;
                renderDynamicElements();
            }

            document.getElementById('iconPickerModal').style.display = 'none';
            saveAllToCloud(true);
        });

        grid.appendChild(btn);
    });
}

document.addEventListener('click', (e) => {
    if (!isEditingMode) return;

    const badgeTrigger = e.target.closest('.icon-picker-trigger');
    if (badgeTrigger) {
        e.preventDefault();
        e.stopPropagation();

        const staticIcon = badgeTrigger.querySelector('.editable-icon[data-icon-key]');
        if (staticIcon) {
            activeIconTarget = { type: 'static', key: staticIcon.getAttribute('data-icon-key') };
            document.getElementById('iconPickerModal').style.display = 'flex';
            return;
        }

        const dynIcon = badgeTrigger.querySelector('.dynamic-icon');
        if (dynIcon) {
            activeIconTarget = {
                type: 'dynamic',
                arrName: dynIcon.getAttribute('data-array'),
                index: parseInt(dynIcon.getAttribute('data-index'))
            };
            document.getElementById('iconPickerModal').style.display = 'flex';
            return;
        }
    }

    const sidebarIcon = e.target.closest('.sidebar-links a.nav-item i, .accordion-left i');
    if (sidebarIcon) {
        e.preventDefault();
        e.stopPropagation();
        if (sidebarIcon.hasAttribute('data-icon-key')) {
            activeIconTarget = { type: 'static', key: sidebarIcon.getAttribute('data-icon-key') };
            document.getElementById('iconPickerModal').style.display = 'flex';
        }
    }
});

// =========================================
// 7. PENYIMPANAN GAMBAR HD RINGAN DI FIRESTORE
// =========================================
function compressImageForFirestore(file, maxWidth = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                let dataUrl = canvas.toDataURL('image/webp', quality);
                if (dataUrl.length > 780000) {
                    dataUrl = canvas.toDataURL('image/webp', 0.6);
                }
                resolve(dataUrl);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function saveMediaToFirestore(mediaKey, dataUrl) {
    const mediaDocRef = doc(db, "portfolio_media", mediaKey);
    await setDoc(mediaDocRef, { imageData: dataUrl, updatedAt: Date.now() });
}

async function loadMediaFromFirestore(mediaKey) {
    const mediaDocRef = doc(db, "portfolio_media", mediaKey);
    const snap = await getDoc(mediaDocRef);
    return snap.exists() ? snap.data().imageData : null;
}

// =========================================
// 8. SPOTLIGHT BORDER + iOS 3D GLASS TILT ENGINE
// =========================================
function initMicrointeractions() {
    if (isTouchDevice) return;

    document.querySelectorAll('.interactive-card').forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = "true";

        card.addEventListener('mousemove', (e) => {
            if (isEditingMode) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);

            if (card.classList.contains('ios-spring-card')) {
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -4.2;
                const rotateY = ((x - centerX) / centerX) * 4.2;
                card.style.transform = `perspective(950px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px) scale(1.015)`;
            }
        });

        card.addEventListener('mouseleave', () => {
            if (card.classList.contains('ios-spring-card')) {
                card.style.transform = '';
            }
        });
    });
}

// =========================================
// 9. SIMPAN KE CLOUD FIRESTORE
// =========================================
async function saveAllToCloud(showAlert = false) {
    if (!currentUser) return;

    const textData = {};
    document.querySelectorAll('.editable[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        const cleanText = el.innerHTML.trim();
        textData[key] = cleanText;
        if (!cleanText && !deletedTextKeys.includes(key)) {
            deletedTextKeys.push(key);
        }
    });

    try {
        await setDoc(portfolioDocRef, { 
            texts: textData,
            contactLinks,
            deletedTextKeys,
            deletedStaticCards,
            savedIcons,
            projectSubmenus,
            extraSidebarItems,
            extraSkills,
            showcaseProjects
        }, { merge: true });

        if (showAlert) showToast("Tersimpan ke Cloud!");
    } catch (error) {
        console.error("Gagal menyimpan ke Cloud:", error);
        showToast("Gagal menyimpan: " + error.message, 4000);
    }
}

function showToast(msg, duration = 2400) {
    const toast = document.getElementById('uploadToast');
    const text = document.getElementById('uploadProgressText');
    text.textContent = msg;
    toast.classList.remove('hidden');
    if (duration > 0) setTimeout(() => toast.classList.add('hidden'), duration);
}

// =========================================
// 10. RENDER KEAHLIAN & HALAMAN PROJECT SEMESTER
// =========================================
function renderDynamicElements() {
    deletedStaticCards.forEach(staticKey => {
        const el = document.querySelector(`[data-static-card="${staticKey}"]`);
        if (el) el.remove();
    });

    renderProjectSubmenus();
    syncContactLinksToUI();

    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraSkills.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card frosted-card interactive-card spotlight-card ios-spring-card scroll-reveal dynamic-col';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn ios-squish" data-type="skill" data-index="${index}" title="Hapus Kartu"><i class="fas fa-trash"></i></button>
            <div class="icon-badge icon-picker-trigger" title="Klik untuk ganti ikon">
                <i class="${col.icon || 'fas fa-microchip'} dynamic-icon spin-hover-icon" data-array="extraSkills" data-index="${index}"></i>
            </div>
            <h3 class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        skillsGrid.appendChild(card);
    });

    document.querySelectorAll('#skillsGrid .delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const staticKey = e.currentTarget.getAttribute('data-static-key');
            if (staticKey) {
                if (!deletedStaticCards.includes(staticKey)) deletedStaticCards.push(staticKey);
                renderDynamicElements();
                saveAllToCloud(true);
                return;
            }
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            extraSkills.splice(idx, 1);
            renderDynamicElements();
            saveAllToCloud(true);
        });
    });

    document.querySelectorAll('.dynamic-field').forEach(el => {
        el.addEventListener('input', () => {
            const idx = parseInt(el.getAttribute('data-index'));
            const field = el.getAttribute('data-field');
            extraSkills[idx][field] = el.innerHTML;
        });
    });

    showProjectsSkeleton(false);
    renderProjectsForActiveSemester();
    attachTextDeleteControls();
    applyEditModeState();
    initMicrointeractions();
    observeScrollRevealElements();
}

function renderProjectsForActiveSemester() {
    const projectsGrid = document.getElementById('projectsGrid');
    const filterContainer = document.getElementById('projectFilterButtons');
    projectsGrid.innerHTML = '';
    filterContainer.innerHTML = '';

    const semesterProjects = showcaseProjects
        .map((proj, realIndex) => ({ ...proj, realIndex }))
        .filter(proj => (proj.semesterId || 'sem-1') === activeSemesterId);

    const categoryCounts = {};
    semesterProjects.forEach(p => {
        const cat = p.category || 'Umum';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn frosted-pill ios-spring-btn ripple-trigger ${activeCategoryFilter === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `<i class="fas fa-layer-group"></i> Semua <span class="filter-count">${semesterProjects.length}</span>`;
    allBtn.addEventListener('click', () => {
        activeCategoryFilter = 'all';
        renderProjectsForActiveSemester();
    });
    filterContainer.appendChild(allBtn);

    Object.keys(categoryCounts).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn frosted-pill ios-spring-btn ripple-trigger ${activeCategoryFilter === cat ? 'active' : ''}`;
        btn.innerHTML = `<i class="fas fa-tag"></i> ${cat} <span class="filter-count">${categoryCounts[cat]}</span>`;
        btn.addEventListener('click', () => {
            activeCategoryFilter = cat;
            renderProjectsForActiveSemester();
        });
        filterContainer.appendChild(btn);
    });

    const filteredList = semesterProjects.filter(p => 
        activeCategoryFilter === 'all' || (p.category || 'Umum') === activeCategoryFilter
    );

    const activeSub = projectSubmenus.find(s => s.id === activeSemesterId);
    const semName = activeSub ? activeSub.label : 'Semester';
    const filterLabel = activeCategoryFilter === 'all' ? `Semua di ${semName}` : activeCategoryFilter;

    document.getElementById('activeFilterLabel').innerHTML = `Menampilkan: <strong>${filterLabel}</strong>`;
    document.getElementById('totalProjectCountBadge').textContent = `${filteredList.length} item`;

    if (filteredList.length === 0) {
        projectsGrid.innerHTML = `
            <div class="empty-projects-placeholder frosted-card scroll-reveal">
                <i class="fas fa-folder-open"></i>
                <p>Belum ada tugas atau project di ${semName}.</p>
                <small>Masuk sebagai admin lalu klik <strong>"Tambah Konten / Project"</strong> di pojok kanan atas untuk menambahkan video YouTube, TikTok, foto, atau tautan.</small>
            </div>
        `;
        observeScrollRevealElements();
        return;
    }

    filteredList.slice().reverse().forEach(proj => {
        const card = document.createElement('div');
        card.className = 'project-card frosted-card interactive-card spotlight-card ios-spring-card scroll-reveal';

        let mediaHtml = '';
        if (proj.mediaType === 'youtube' && proj.youtubeId) {
            mediaHtml = `
                <div class="project-media-wrapper">
                    <iframe src="https://www.youtube.com/embed/${proj.youtubeId}" title="${proj.title}" allowfullscreen loading="lazy"></iframe>
                </div>
            `;
        } else if (proj.mediaType === 'tiktok') {
            const tiktokId = extractTikTokId(proj.mediaUrl);
            if (tiktokId) {
                mediaHtml = `
                    <div class="project-media-wrapper">
                        <iframe src="https://www.tiktok.com/embed/v2/${tiktokId}" title="${proj.title}" allowfullscreen loading="lazy"></iframe>
                    </div>
                `;
            } else {
                mediaHtml = `
                    <div class="project-media-wrapper">
                        <div class="tiktok-embed-box">
                            <i class="fab fa-tiktok"></i>
                            <a href="${proj.mediaUrl}" target="_blank" rel="noopener" class="btn primary ios-spring-btn ripple-trigger" style="padding: 0.45rem 1rem; font-size: 0.82rem;">Tonton di TikTok</a>
                        </div>
                    </div>
                `;
            }
        } else if (proj.mediaType === 'image' && proj.imageData) {
            mediaHtml = `
                <div class="project-media-wrapper">
                    <img src="${proj.imageData}" alt="${proj.title}" loading="lazy">
                </div>
            `;
        }

        const extraLinkHtml = proj.extraLink ? `
            <a href="${proj.extraLink}" target="_blank" rel="noopener" class="project-link-preview">
                <i class="fas fa-external-link-alt"></i> ${proj.extraLink}
            </a>
        ` : (proj.mediaType === 'link' && proj.mediaUrl ? `
            <a href="${proj.mediaUrl}" target="_blank" rel="noopener" class="project-link-preview">
                <i class="fas fa-link"></i> ${proj.mediaUrl}
            </a>
        ` : '');

        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn ios-squish" data-real-index="${proj.realIndex}" title="Hapus Project">
                <i class="fas fa-trash"></i>
            </button>
            ${mediaHtml}
            <div class="project-meta-badges">
                <span class="tag">${proj.tag || 'PROJECT'}</span>
                ${proj.category ? `<span class="teacher-tag"><i class="fas fa-user-tie"></i> ${proj.category}</span>` : ''}
            </div>
            <h3 class="editable dynamic-proj-field" data-real-index="${proj.realIndex}" data-field="title">${proj.title}</h3>
            <p class="editable dynamic-proj-field" data-real-index="${proj.realIndex}" data-field="desc">${proj.desc}</p>
            ${extraLinkHtml}
            <button type="button" class="btn-card-fullscreen ios-spring-btn ripple-trigger" data-real-index="${proj.realIndex}">
                <i class="fas fa-play spin-hover-icon"></i> Putar / Lihat Layar Penuh
            </button>
        `;

        projectsGrid.appendChild(card);
    });

    projectsGrid.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const realIdx = parseInt(btn.getAttribute('data-real-index'));
            const removed = showcaseProjects.splice(realIdx, 1)[0];
            if (removed && removed.mediaDocId) {
                await deleteDoc(doc(db, "portfolio_media", removed.mediaDocId));
            }
            renderDynamicElements();
            saveAllToCloud(true);
        });
    });

    projectsGrid.querySelectorAll('.dynamic-proj-field').forEach(el => {
        el.addEventListener('input', () => {
            const realIdx = parseInt(el.getAttribute('data-real-index'));
            const field = el.getAttribute('data-field');
            if (showcaseProjects[realIdx]) showcaseProjects[realIdx][field] = el.innerHTML;
        });
    });

    projectsGrid.querySelectorAll('.btn-card-fullscreen').forEach(btn => {
        btn.addEventListener('click', () => {
            const realIdx = parseInt(btn.getAttribute('data-real-index'));
            openFullscreenProject(showcaseProjects[realIdx]);
        });
    });

    attachTextDeleteControls();
    applyEditModeState();
    initMicrointeractions();
    observeScrollRevealElements();
}

function openFullscreenProject(proj) {
    if (!proj) return;
    const modal = document.getElementById('fullscreenMediaModal');
    const titleEl = document.getElementById('fullscreenMediaTitle');
    const container = document.getElementById('fullscreenMediaContainer');

    titleEl.textContent = proj.title;
    container.innerHTML = '';

    if (proj.mediaType === 'youtube' && proj.youtubeId) {
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${proj.youtubeId}?autoplay=1" allowfullscreen></iframe>`;
    } else if (proj.mediaType === 'image' && proj.imageData) {
        container.innerHTML = `<img src="${proj.imageData}" alt="${proj.title}">`;
    } else if (proj.mediaType === 'tiktok') {
        const tiktokId = extractTikTokId(proj.mediaUrl);
        if (tiktokId) {
            container.innerHTML = `<iframe src="https://www.tiktok.com/embed/v2/${tiktokId}" allowfullscreen></iframe>`;
        } else {
            window.open(proj.mediaUrl, '_blank');
            return;
        }
    } else if (proj.extraLink || proj.mediaUrl) {
        window.open(proj.extraLink || proj.mediaUrl, '_blank');
        return;
    }

    modal.style.display = 'flex';
}

// =========================================
// 11. MODAL TAMBAH KONTEN / PROJECT BARU
// =========================================
const addProjectModal = document.getElementById('addProjectModal');
const projMediaType = document.getElementById('projMediaType');
const projUrlGroup = document.getElementById('projUrlGroup');
const projFileGroup = document.getElementById('projFileGroup');
const projUrlLabel = document.getElementById('projUrlLabel');
const projMediaUrlInput = document.getElementById('projMediaUrlInput');

document.getElementById('openAddProjectModalBtn').addEventListener('click', () => {
    document.getElementById('projSemesterSelect').value = activeSemesterId;
    addProjectModal.style.display = 'flex';
});

projMediaType.addEventListener('change', () => {
    const val = projMediaType.value;
    if (val === 'image') {
        projUrlGroup.classList.add('hidden');
        projFileGroup.classList.remove('hidden');
    } else {
        projUrlGroup.classList.remove('hidden');
        projFileGroup.classList.add('hidden');

        if (val === 'youtube') {
            projUrlLabel.textContent = "Tempel Link Video YouTube";
            projMediaUrlInput.placeholder = "https://www.youtube.com/watch?v=... atau https://youtu.be/...";
        } else if (val === 'tiktok') {
            projUrlLabel.textContent = "Tempel Link Video TikTok";
            projMediaUrlInput.placeholder = "https://www.tiktok.com/@username/video/...";
        } else {
            projUrlLabel.textContent = "Tempel Tautan Link / Google Drive";
            projMediaUrlInput.placeholder = "https://drive.google.com/... atau https://...";
        }
    }
});

document.getElementById('submitNewProjectBtn').addEventListener('click', async () => {
    if (!currentUser) return alert("Harap login admin terlebih dahulu.");

    const semesterId = document.getElementById('projSemesterSelect').value || activeSemesterId;
    const category = document.getElementById('projCategoryInput').value.trim() || "Umum";
    const mediaType = projMediaType.value;
    const mediaUrl = projMediaUrlInput.value.trim();
    const fileInput = document.getElementById('projMediaFileInput');
    const title = document.getElementById('projTitleInput').value.trim();
    const tag = document.getElementById('projTagInput').value.trim() || mediaType.toUpperCase();
    const extraLink = document.getElementById('projExtraLinkInput').value.trim();
    const desc = document.getElementById('projDescInput').value.trim();

    if (!title) return alert("Judul Karya / Tugas wajib diisi!");

    const submitBtn = document.getElementById('submitNewProjectBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    try {
        let youtubeId = null;
        let imageData = null;
        let mediaDocId = null;

        if (mediaType === 'youtube') {
            youtubeId = extractYouTubeId(mediaUrl);
            if (!youtubeId) throw new Error("Link YouTube tidak valid.");
        } else if (mediaType === 'tiktok' || mediaType === 'link') {
            if (!mediaUrl) throw new Error("Harap tempelkan tautan URL terlebih dahulu.");
        } else if (mediaType === 'image') {
            const file = fileInput.files[0];
            if (!file) throw new Error("Harap pilih file foto terlebih dahulu.");
            showToast("Memproses foto HD...", 0);
            imageData = await compressImageForFirestore(file, 1280, 0.8);
            mediaDocId = `proj_img_${Date.now()}`;
            await saveMediaToFirestore(mediaDocId, imageData);
        }

        showcaseProjects.push({
            id: Date.now(),
            semesterId,
            category,
            mediaType,
            mediaUrl,
            youtubeId,
            mediaDocId,
            imageData,
            title,
            tag,
            extraLink,
            desc
        });

        await saveAllToCloud(true);
        activeSemesterId = semesterId;
        renderDynamicElements();
        switchPage('projects', semesterId);

        document.getElementById('projCategoryInput').value = '';
        projMediaUrlInput.value = '';
        fileInput.value = '';
        document.getElementById('projTitleInput').value = '';
        document.getElementById('projTagInput').value = '';
        document.getElementById('projExtraLinkInput').value = '';
        document.getElementById('projDescInput').value = '';
        addProjectModal.style.display = 'none';

    } catch (err) {
        alert(err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Simpan & Tampilkan Project';
    }
});

// =========================================
// 12. MUAT DATA DARI CLOUD FIRESTORE (DENGAN SKELETON)
// =========================================
async function loadCloudContent() {
    showProjectsSkeleton(true);
    try {
        const docSnap = await getDoc(portfolioDocRef);
        isInitialCloudLoaded = true;
        if (docSnap.exists()) {
            const data = docSnap.data();

            deletedTextKeys = data.deletedTextKeys || [];
            deletedStaticCards = data.deletedStaticCards || [];
            if (data.projectSubmenus && data.projectSubmenus.length > 0) {
                projectSubmenus = data.projectSubmenus;
            }
            if (data.contactLinks) {
                contactLinks = { ...contactLinks, ...data.contactLinks };
            }

            if (data.texts) {
                document.querySelectorAll('.editable[data-key]').forEach(el => {
                    const key = el.getAttribute('data-key');
                    if (deletedTextKeys.includes(key) || data.texts[key] === '') {
                        el.innerHTML = '';
                        if (el.parentElement && el.parentElement.classList.contains('editable-wrapper')) {
                            el.parentElement.style.display = 'none';
                        }
                    } else if (data.texts[key]) {
                        el.innerHTML = data.texts[key];
                    }
                });
            }

            if (data.savedIcons) {
                savedIcons = data.savedIcons;
                Object.keys(savedIcons).forEach(key => {
                    const iconEl = document.querySelector(`.editable-icon[data-icon-key="${key}"]`);
                    if (iconEl) iconEl.className = `${savedIcons[key]} editable-icon`;
                });
            }

            extraSidebarItems = data.extraSidebarItems || [];
            extraSkills = data.extraSkills || [];
            showcaseProjects = data.showcaseProjects || [];
            renderDynamicElements();
        } else {
            showProjectsSkeleton(false);
            renderProjectSubmenus();
            syncContactLinksToUI();
            attachTextDeleteControls();
        }

        const [profileData, bgData] = await Promise.all([
            loadMediaFromFirestore('profileImage'),
            loadMediaFromFirestore('bgImage')
        ]);

        if (profileData) document.getElementById('profileImage').src = profileData;
        if (bgData) document.body.style.backgroundImage = `url('${bgData}')`;

    } catch (error) {
        isInitialCloudLoaded = true;
        showProjectsSkeleton(false);
        console.error("Gagal memuat data dari Firebase:", error);
    }
}

// =========================================
// 13. KONTROL ADMIN & EVENT TAMBAHAN
// =========================================
const adminLoginBtn = document.getElementById('adminLoginBtn');
const adminQuickControls = document.getElementById('adminQuickControls');
const toggleEditModeBtn = document.getElementById('toggleEditModeBtn');
const loginModal = document.getElementById('loginModal');
const submitLoginBtn = document.getElementById('submitLoginBtn');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        adminLoginBtn.classList.add('hidden');
        adminQuickControls.classList.remove('hidden');
        isEditingMode = true;
        applyEditModeState();
    } else {
        adminLoginBtn.classList.remove('hidden');
        adminQuickControls.classList.add('hidden');
        isEditingMode = false;
        applyEditModeState();
    }
});

function applyEditModeState() {
    const editables = document.querySelectorAll('.editable');
    if (isEditingMode) {
        document.body.classList.add('editing-active');
        editables.forEach(el => el.setAttribute('contenteditable', 'true'));
        toggleEditModeBtn.innerHTML = '<i class="fas fa-check"></i> Selesai Edit';
        toggleEditModeBtn.classList.remove('view-mode-state');
    } else {
        document.body.classList.remove('editing-active');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        toggleEditModeBtn.innerHTML = '<i class="fas fa-pen"></i> Mode Edit';
        toggleEditModeBtn.classList.add('view-mode-state');
    }
}

toggleEditModeBtn.addEventListener('click', async () => {
    if (isEditingMode) {
        await saveAllToCloud(true);
        isEditingMode = false;
    } else {
        isEditingMode = true;
    }
    applyEditModeState();
});

adminLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    adminEmailInput.focus();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        document.getElementById(modalId).style.display = 'none';
        if (modalId === 'fullscreenMediaModal') {
            document.getElementById('fullscreenMediaContainer').innerHTML = '';
        }
    });
});

async function handleFirebaseLogin() {
    const email = adminEmailInput.value.trim();
    const password = adminPasswordInput.value;
    if (!email || !password) return alert("Harap isi email dan password admin!");

    try {
        submitLoginBtn.textContent = "Memverifikasi...";
        await signInWithEmailAndPassword(auth, email, password);
        loginModal.style.display = 'none';
        adminEmailInput.value = '';
        adminPasswordInput.value = '';
    } catch (error) {
        alert("Login gagal: " + error.message);
    } finally {
        submitLoginBtn.textContent = "Masuk";
    }
}

submitLoginBtn.addEventListener('click', handleFirebaseLogin);
adminPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleFirebaseLogin();
});

logoutAdminBtn.addEventListener('click', async () => {
    await signOut(auth);
});

document.getElementById('addSkillColBtn').addEventListener('click', () => {
    extraSkills.push({
        icon: "fas fa-microchip",
        title: "Keahlian Baru",
        desc: "Klik teks ini untuk menuliskan deskripsi keahlian."
    });
    renderDynamicElements();
    saveAllToCloud(true);
});

function setupFirestoreImageUpload(inputId, mediaKey, maxWidth, applyCallback) {
    const inputEl = document.getElementById(inputId);
    inputEl.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        const instantUrl = URL.createObjectURL(file);
        applyCallback(instantUrl);
        showToast("Menyimpan foto ke Cloud...", 0);

        try {
            const optimizedDataUrl = await compressImageForFirestore(file, maxWidth, 0.82);
            await saveMediaToFirestore(mediaKey, optimizedDataUrl);
            applyCallback(optimizedDataUrl);
            showToast("Foto tersimpan di Cloud!", 3000);
        } catch (error) {
            showToast("Gagal menyimpan foto: " + error.message, 4000);
        } finally {
            inputEl.value = '';
        }
    });
}

setupFirestoreImageUpload('uploadProfile', 'profileImage', 700, (url) => {
    document.getElementById('profileImage').src = url;
});
setupFirestoreImageUpload('uploadBg', 'bgImage', 1600, (url) => {
    document.body.style.backgroundImage = `url('${url}')`;
});

document.getElementById('resetAllBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    if (confirm("Yakin ingin mereset seluruh konten dan foto di Cloud ke pengaturan awal?")) {
        await Promise.all([
            deleteDoc(portfolioDocRef),
            deleteDoc(doc(db, "portfolio_media", "profileImage")),
            deleteDoc(doc(db, "portfolio_media", "bgImage"))
        ]);
        location.reload();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    attachTextDeleteControls();
    initIconPicker();
    initMicrointeractions();
    observeScrollRevealElements();
    loadCloudContent();
});