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

let extraSidebarItems = [];
let extraSkills = [];
let showcaseProjects = [];
let savedIcons = {};
let deletedStaticCards = []; // Menyimpan daftar kartu bawaan yang dihapus
let deletedTextKeys = [];    // Menyimpan daftar key teks yang dihapus
let activeProjectFilter = 'all';
let isEditingMode = false;
let currentUser = null;

// =========================================
// 2. KONTROL HAPUS SEMUA TEKS SAAT MODE EDIT
// =========================================
function attachTextDeleteControls() {
    document.querySelectorAll('.editable').forEach(el => {
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

            // Jika merupakan field di kartu dinamis
            if (el.classList.contains('dynamic-field')) {
                const idx = parseInt(el.getAttribute('data-index'));
                const field = el.getAttribute('data-field');
                if (extraSkills[idx]) extraSkills[idx][field] = '';
            } else if (el.classList.contains('dynamic-proj-field')) {
                const idx = parseInt(el.getAttribute('data-index'));
                const field = el.getAttribute('data-field');
                if (showcaseProjects[idx]) showcaseProjects[idx][field] = '';
            }

            wrapper.style.display = 'none';
            saveAllToCloud(true);
        });

        wrapper.appendChild(delBtn);
    });
}

// =========================================
// 3. PARSER VIDEO YOUTUBE & TIKTOK
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
// 4. PEMILIH IKON (ICON PICKER)
// =========================================
const ICON_OPTIONS = [
    "fas fa-network-wired", "fas fa-server", "fas fa-router", "fas fa-wifi",
    "fas fa-shield-alt", "fas fa-terminal", "fas fa-microchip", "fas fa-wave-square",
    "fas fa-play-circle", "fab fa-youtube", "fab fa-tiktok", "fas fa-video",
    "fas fa-cloud", "fas fa-database", "fas fa-lock", "fas fa-code",
    "fas fa-laptop-code", "fas fa-desktop", "fas fa-hdd", "fas fa-memory",
    "fas fa-tools", "fas fa-cogs", "fas fa-project-diagram", "fas fa-sitemap",
    "fas fa-certificate", "fas fa-award", "fas fa-star", "fas fa-graduation-cap",
    "fas fa-folder-open", "fas fa-home", "fas fa-user", "fas fa-envelope"
];

let activeIconTarget = null;

function initIconPicker() {
    const grid = document.getElementById('iconGridPicker');
    grid.innerHTML = '';

    ICON_OPTIONS.forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option-btn';
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

    const sidebarIcon = e.target.closest('.sidebar-links a i');
    if (sidebarIcon) {
        e.preventDefault();
        e.stopPropagation();
        if (sidebarIcon.hasAttribute('data-icon-key')) {
            activeIconTarget = { type: 'static', key: sidebarIcon.getAttribute('data-icon-key') };
            document.getElementById('iconPickerModal').style.display = 'flex';
        } else if (sidebarIcon.hasAttribute('data-sidebar-index')) {
            activeIconTarget = {
                type: 'dynamic',
                arrName: 'extraSidebarItems',
                index: parseInt(sidebarIcon.getAttribute('data-sidebar-index'))
            };
            document.getElementById('iconPickerModal').style.display = 'flex';
        }
    }
});

// =========================================
// 5. PENYIMPANAN GAMBAR HD GRATIS DI CLOUD FIRESTORE
// =========================================
function compressImageForFirestore(file, maxWidth = 1400, quality = 0.82) {
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
                if (dataUrl.length > 820000) {
                    dataUrl = canvas.toDataURL('image/webp', 0.62);
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
// 6. MICROINTERACTIONS ENGINE
// =========================================
function initMicrointeractions() {
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

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = ((y - centerY) / centerY) * -3;
            const rotateY = ((x - centerX) / centerX) * 3;

            card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// =========================================
// 7. SIMPAN OTOMATIS KE CLOUD FIRESTORE
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
            deletedTextKeys,
            deletedStaticCards,
            savedIcons,
            extraSidebarItems,
            extraSkills,
            showcaseProjects
        }, { merge: true });

        if (showAlert) showToast("Perubahan tersimpan ke Cloud!");
    } catch (error) {
        console.error("Gagal menyimpan ke Cloud:", error);
        showToast("Gagal menyimpan: " + error.message, 4000);
    }
}

function showToast(msg, duration = 2500) {
    const toast = document.getElementById('uploadToast');
    const text = document.getElementById('uploadProgressText');
    text.textContent = msg;
    toast.classList.remove('hidden');
    if (duration > 0) setTimeout(() => toast.classList.add('hidden'), duration);
}

// =========================================
// 8. RENDER SIDEBAR, KEAHLIAN & PROJECT MEDIA
// =========================================
function renderDynamicElements() {
    // Sembunyikan kartu statis yang sudah dihapus
    deletedStaticCards.forEach(staticKey => {
        const el = document.querySelector(`[data-static-card="${staticKey}"]`);
        if (el) el.remove();
    });

    // 1. Render Sidebar Tambahan
    const sidebarList = document.getElementById('sidebarLinks');
    sidebarList.querySelectorAll('.dynamic-sidebar-item').forEach(el => el.remove());

    extraSidebarItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'dynamic-sidebar-item';
        li.innerHTML = `
            <a href="${item.link}">
                <i class="${item.icon}" data-sidebar-index="${index}"></i> 
                <span class="editable dynamic-sidebar-label" data-index="${index}">${item.label}</span>
            </a>
            <button class="edit-only-box delete-sidebar-item" data-index="${index}" title="Hapus Menu">&times;</button>
        `;
        sidebarList.appendChild(li);
    });

    sidebarList.querySelectorAll('.delete-sidebar-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            extraSidebarItems.splice(idx, 1);
            renderDynamicElements();
            saveAllToCloud();
        });
    });

    // 2. Render Keahlian Tambahan
    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraSkills.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card glass-card interactive-card dynamic-col reveal visible';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="skill" data-index="${index}" title="Hapus Kartu"><i class="fas fa-trash"></i></button>
            <div class="icon-badge icon-picker-trigger" title="Klik untuk ganti ikon">
                <i class="${col.icon || 'fas fa-microchip'} dynamic-icon" data-array="extraSkills" data-index="${index}"></i>
            </div>
            <h3 class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        skillsGrid.appendChild(card);
    });

    // 3. Render Kartu Project Media
    const projectsGrid = document.getElementById('projectsGrid');
    const placeholder = document.getElementById('emptyProjectsPlaceholder');
    projectsGrid.querySelectorAll('.dynamic-project-card').forEach(el => el.remove());

    if (showcaseProjects.length === 0) {
        if (placeholder) placeholder.classList.remove('hidden');
    } else {
        if (placeholder) placeholder.classList.add('hidden');
    }

    showcaseProjects.forEach((proj, index) => {
        const card = document.createElement('div');
        card.className = 'project-card glass-card interactive-card dynamic-project-card reveal visible';
        card.setAttribute('data-category', proj.category || 'Tugas');

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
                            <a href="${proj.mediaUrl}" target="_blank" rel="noopener" class="btn primary" style="padding: 0.45rem 1rem; font-size: 0.82rem;">Tonton di TikTok</a>
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
            <button class="edit-only-box delete-card-btn" data-type="showcaseProject" data-index="${index}" title="Hapus Project">
                <i class="fas fa-trash"></i>
            </button>
            ${mediaHtml}
            <div class="project-meta-badges">
                <span class="tag">${proj.tag || 'PROJECT'}</span>
                ${proj.category ? `<span class="teacher-tag"><i class="fas fa-user-tie"></i> ${proj.category}</span>` : ''}
            </div>
            <h3 class="editable dynamic-proj-field" data-index="${index}" data-field="title">${proj.title}</h3>
            <p class="editable dynamic-proj-field" data-index="${index}" data-field="desc">${proj.desc}</p>
            ${extraLinkHtml}
            <button type="button" class="btn-card-fullscreen" data-index="${index}">
                <i class="fas fa-play"></i> Putar / Lihat Layar Penuh
            </button>
        `;

        projectsGrid.insertBefore(card, projectsGrid.firstChild);
    });

    // Event Hapus Kartu (Statis maupun Dinamis)
    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const staticKey = e.currentTarget.getAttribute('data-static-key');
            if (staticKey) {
                if (!deletedStaticCards.includes(staticKey)) deletedStaticCards.push(staticKey);
                renderDynamicElements();
                saveAllToCloud(true);
                return;
            }

            const type = e.currentTarget.getAttribute('data-type');
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            if (type === 'skill') extraSkills.splice(idx, 1);
            if (type === 'showcaseProject') {
                const removed = showcaseProjects.splice(idx, 1)[0];
                if (removed && removed.mediaDocId) {
                    await deleteDoc(doc(db, "portfolio_media", removed.mediaDocId));
                }
            }
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

    document.querySelectorAll('.dynamic-proj-field').forEach(el => {
        el.addEventListener('input', () => {
            const idx = parseInt(el.getAttribute('data-index'));
            const field = el.getAttribute('data-field');
            showcaseProjects[idx][field] = el.innerHTML;
        });
    });

    document.querySelectorAll('.btn-card-fullscreen').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            openFullscreenProject(showcaseProjects[idx]);
        });
    });

    attachTextDeleteControls();
    rebuildProjectFilters();
    applyEditModeState();
    initMicrointeractions();
}

// =========================================
// 9. FILTER KATEGORI / GURU OTOMATIS & COUNTER ITEM
// =========================================
function rebuildProjectFilters() {
    const filterContainer = document.getElementById('projectFilterButtons');
    const allCards = Array.from(document.querySelectorAll('#projectsGrid .project-card'));

    const categoryCounts = {};
    allCards.forEach(card => {
        const cat = card.getAttribute('data-category') || 'Lainnya';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    filterContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn glass-pill ${activeProjectFilter === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `<i class="fas fa-layer-group"></i> Semua Tugas <span class="filter-count">${allCards.length}</span>`;
    allBtn.addEventListener('click', () => {
        activeProjectFilter = 'all';
        applyProjectFilter();
    });
    filterContainer.appendChild(allBtn);

    Object.keys(categoryCounts).forEach(cat => {
        const btn = document.createElement('button');
        btn.className = `filter-btn glass-pill ${activeProjectFilter === cat ? 'active' : ''}`;
        btn.innerHTML = `<i class="fas fa-folder"></i> ${cat} <span class="filter-count">${categoryCounts[cat]}</span>`;
        btn.addEventListener('click', () => {
            activeProjectFilter = cat;
            applyProjectFilter();
        });
        filterContainer.appendChild(btn);
    });

    applyProjectFilter();
}

function applyProjectFilter() {
    const allCards = Array.from(document.querySelectorAll('#projectsGrid .project-card'));
    let visibleCount = 0;

    allCards.forEach(card => {
        const cat = card.getAttribute('data-category') || 'Lainnya';
        if (activeProjectFilter === 'all' || cat === activeProjectFilter) {
            card.classList.remove('hide');
            visibleCount++;
        } else {
            card.classList.add('hide');
        }
    });

    document.querySelectorAll('#projectFilterButtons .filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (activeProjectFilter === 'all' && btn.textContent.includes('Semua Tugas')) {
            btn.classList.add('active');
        } else if (btn.textContent.includes(activeProjectFilter)) {
            btn.classList.add('active');
        }
    });

    const labelText = activeProjectFilter === 'all' ? 'Semua Tugas' : activeProjectFilter;
    document.getElementById('activeFilterLabel').innerHTML = `Menampilkan: <strong>${labelText}</strong>`;
    document.getElementById('totalProjectCountBadge').textContent = `${visibleCount} item`;
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
// 10. MODAL TAMBAH KONTEN / PROJECT BARU
// =========================================
const openAddProjectModalBtn = document.getElementById('openAddProjectModalBtn');
const addProjectModal = document.getElementById('addProjectModal');
const projMediaType = document.getElementById('projMediaType');
const projUrlGroup = document.getElementById('projUrlGroup');
const projFileGroup = document.getElementById('projFileGroup');
const projUrlLabel = document.getElementById('projUrlLabel');
const projMediaUrlInput = document.getElementById('projMediaUrlInput');
const projUrlHint = document.getElementById('projUrlHint');

openAddProjectModalBtn.addEventListener('click', () => {
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
            projUrlHint.textContent = "Video YouTube akan langsung terpasang dan bisa diputar di kartu.";
        } else if (val === 'tiktok') {
            projUrlLabel.textContent = "Tempel Link Video TikTok";
            projMediaUrlInput.placeholder = "https://www.tiktok.com/@username/video/...";
            projUrlHint.textContent = "Tempelkan tautan lengkap video TikTok.";
        } else {
            projUrlLabel.textContent = "Tempel Tautan Link / Google Drive";
            projMediaUrlInput.placeholder = "https://drive.google.com/... atau https://...";
            projUrlHint.textContent = "Tautan akan ditampilkan sebagai link yang bisa diklik langsung.";
        }
    }
});

document.getElementById('submitNewProjectBtn').addEventListener('click', async () => {
    if (!currentUser) return alert("Harap login admin terlebih dahulu.");

    const category = document.getElementById('projCategoryInput').value.trim() || "Tugas Umum";
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
            if (!youtubeId) {
                throw new Error("Link YouTube tidak valid. Pastikan menempelkan URL video YouTube.");
            }
        } else if (mediaType === 'tiktok' || mediaType === 'link') {
            if (!mediaUrl) throw new Error("Harap tempelkan tautan URL terlebih dahulu.");
        } else if (mediaType === 'image') {
            const file = fileInput.files[0];
            if (!file) throw new Error("Harap pilih file foto terlebih dahulu.");
            showToast("Memproses foto HD...", 0);
            imageData = await compressImageForFirestore(file, 1280, 0.82);
            mediaDocId = `proj_img_${Date.now()}`;
            await saveMediaToFirestore(mediaDocId, imageData);
        }

        showcaseProjects.push({
            id: Date.now(),
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
        renderDynamicElements();

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
// 11. MUAT DATA DARI CLOUD FIRESTORE
// =========================================
async function loadCloudContent() {
    try {
        const docSnap = await getDoc(portfolioDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            deletedTextKeys = data.deletedTextKeys || [];
            deletedStaticCards = data.deletedStaticCards || [];

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
            attachTextDeleteControls();
            rebuildProjectFilters();
        }

        const [profileData, bgData] = await Promise.all([
            loadMediaFromFirestore('profileImage'),
            loadMediaFromFirestore('bgImage')
        ]);

        if (profileData) document.getElementById('profileImage').src = profileData;
        if (bgData) document.body.style.backgroundImage = `url('${bgData}')`;

    } catch (error) {
        console.error("Gagal memuat data dari Firebase:", error);
    }
}

// =========================================
// 12. KONTROL ADMIN & EVENT TAMBAHAN
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

document.getElementById('openAddSidebarModal').addEventListener('click', () => {
    document.getElementById('addSidebarModal').style.display = 'flex';
});

document.getElementById('confirmAddSidebarBtn').addEventListener('click', () => {
    const label = document.getElementById('newSidebarLabel').value.trim();
    const link = document.getElementById('newSidebarLink').value.trim() || '#projects';
    const icon = document.getElementById('newSidebarIcon').value;
    if (!label) return alert("Nama menu sidebar tidak boleh kosong!");

    extraSidebarItems.push({ label, link, icon });
    document.getElementById('newSidebarLabel').value = '';
    document.getElementById('newSidebarLink').value = '';
    document.getElementById('addSidebarModal').style.display = 'none';
    renderDynamicElements();
    saveAllToCloud();
});

document.getElementById('addSkillColBtn').addEventListener('click', () => {
    extraSkills.push({
        icon: "fas fa-microchip",
        title: "Keahlian Baru",
        desc: "Klik teks ini untuk menuliskan deskripsi keahlian."
    });
    renderDynamicElements();
    saveAllToCloud();
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
            const optimizedDataUrl = await compressImageForFirestore(file, maxWidth, 0.85);
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

const sidebar = document.getElementById('sidebar');
document.getElementById('openSidebarBtn').addEventListener('click', () => sidebar.classList.add('open'));
document.getElementById('closeSidebarBtn').addEventListener('click', () => sidebar.classList.remove('open'));

document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    showToast(`Terima kasih, ${name}! Pesan terkirim.`);
    e.target.reset();
});

document.addEventListener('DOMContentLoaded', () => {
    attachTextDeleteControls();
    initIconPicker();
    initMicrointeractions();
    loadCloudContent();
});