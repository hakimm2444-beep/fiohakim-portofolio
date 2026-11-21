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
let extraProjects = [];
let extraCustomCols = [];
let savedIcons = {};
let isEditingMode = false;
let currentUser = null;

// Daftar Pilihan Ikon TJKT, Jaringan, Server & Umum
const ICON_OPTIONS = [
    "fas fa-network-wired", "fas fa-server", "fas fa-router", "fas fa-wifi",
    "fas fa-shield-alt", "fas fa-terminal", "fas fa-microchip", "fas fa-wave-square",
    "fas fa-ethernet", "fas fa-satellite-dish", "fas fa-broadcast-tower", "fas fa-cloud",
    "fas fa-database", "fas fa-lock", "fas fa-key", "fas fa-code",
    "fas fa-laptop-code", "fas fa-desktop", "fas fa-hdd", "fas fa-memory",
    "fas fa-tools", "fas fa-cogs", "fas fa-project-diagram", "fas fa-sitemap",
    "fas fa-certificate", "fas fa-award", "fas fa-medal", "fas fa-star",
    "fas fa-graduation-cap", "fas fa-briefcase", "fas fa-folder-open", "fas fa-home",
    "fas fa-user", "fas fa-user-tie", "fas fa-envelope", "fas fa-globe"
];

// =========================================
// 2. PEMILIH IKON (ICON PICKER) INTERAKTIF
// =========================================
let activeIconTarget = null; // Menyimpan referensi ikon yang sedang dipilih untuk diganti

function initIconPicker() {
    const grid = document.getElementById('iconGridPicker');
    grid.innerHTML = '';

    ICON_OPTIONS.forEach(iconClass => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'icon-option-btn';
        btn.title = iconClass;
        btn.innerHTML = `<i class="${iconClass}"></i>`;

        btn.addEventListener('click', () => {
            if (!activeIconTarget) return;

            if (activeIconTarget.type === 'static') {
                const key = activeIconTarget.key;
                savedIcons[key] = iconClass;
                const iconEl = document.querySelector(`.editable-icon[data-icon-key="${key}"]`);
                if (iconEl) {
                    iconEl.className = `${iconClass} editable-icon`;
                }
            } else if (activeIconTarget.type === 'dynamic') {
                const { arrName, index } = activeIconTarget;
                if (arrName === 'extraSkills') extraSkills[index].icon = iconClass;
                if (arrName === 'extraProjects') extraProjects[index].icon = iconClass;
                if (arrName === 'extraCustomCols') extraCustomCols[index].icon = iconClass;
                if (arrName === 'extraSidebarItems') extraSidebarItems[index].icon = iconClass;
                renderDynamicElements();
            }

            document.getElementById('iconPickerModal').style.display = 'none';
            saveAllToCloud(true);
        });

        grid.appendChild(btn);
    });
}

// Delegasi klik untuk mengganti ikon saat Mode Edit aktif
document.addEventListener('click', (e) => {
    if (!isEditingMode) return;

    // 1. Klik pada lencana ikon kartu (About, Skills, Projects, Custom)
    const badgeTrigger = e.target.closest('.icon-picker-trigger');
    if (badgeTrigger) {
        e.preventDefault();
        e.stopPropagation();

        const staticIcon = badgeTrigger.querySelector('.editable-icon[data-icon-key]');
        if (staticIcon) {
            activeIconTarget = {
                type: 'static',
                key: staticIcon.getAttribute('data-icon-key')
            };
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

    // 2. Klik langsung pada ikon menu sidebar
    const sidebarIcon = e.target.closest('.sidebar-links a i');
    if (sidebarIcon) {
        e.preventDefault();
        e.stopPropagation();

        if (sidebarIcon.hasAttribute('data-icon-key')) {
            activeIconTarget = {
                type: 'static',
                key: sidebarIcon.getAttribute('data-icon-key')
            };
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
// 3. PENYIMPANAN GAMBAR HD GRATIS DI CLOUD FIRESTORE
// =========================================
function compressImageForFirestore(file, maxWidth = 1600, quality = 0.85) {
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
                if (dataUrl.length > 850000) {
                    dataUrl = canvas.toDataURL('image/webp', 0.65);
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
    await setDoc(mediaDocRef, {
        imageData: dataUrl,
        updatedAt: Date.now()
    });
}

async function loadMediaFromFirestore(mediaKey) {
    const mediaDocRef = doc(db, "portfolio_media", mediaKey);
    const snap = await getDoc(mediaDocRef);
    return snap.exists() ? snap.data().imageData : null;
}

// =========================================
// 4. MICROINTERACTIONS ENGINE (TILT, GLARE, REVEAL)
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
            const rotateX = ((y - centerY) / centerY) * -4;
            const rotateY = ((x - centerX) / centerX) * 4;

            card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = '';
        });
    });

    document.querySelectorAll('.magnetic-btn').forEach(btn => {
        if (btn.dataset.magBound) return;
        btn.dataset.magBound = "true";

        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = (e.clientX - rect.left - rect.width / 2) * 0.18;
            const y = (e.clientY - rect.top - rect.height / 2) * 0.18;
            btn.style.transform = `translate(${x}px, ${y}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 220;

    sections.forEach(sec => {
        const top = sec.offsetTop;
        const height = sec.offsetHeight;
        const id = sec.getAttribute('id');

        if (scrollPos >= top && scrollPos < top + height) {
            document.querySelectorAll('.sidebar-links a').forEach(a => {
                a.classList.remove('active');
                if (a.getAttribute('href') === `#${id}`) {
                    a.classList.add('active');
                }
            });
        }
    });
});

// =========================================
// 5. SIMPAN OTOMATIS TEKS, IKON & KOLOM KE FIRESTORE
// =========================================
async function saveAllToCloud(showAlert = false) {
    if (!currentUser) return;

    const textData = {};
    document.querySelectorAll('.editable[data-key]').forEach(el => {
        const key = el.getAttribute('data-key');
        textData[key] = el.innerHTML;
    });

    try {
        await setDoc(portfolioDocRef, { 
            texts: textData,
            savedIcons,
            extraSidebarItems,
            extraSkills,
            extraProjects,
            extraCustomCols
        }, { merge: true });

        if (showAlert) {
            showToast("Perubahan tersimpan ke Cloud!");
        }
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
    if (duration > 0) {
        setTimeout(() => toast.classList.add('hidden'), duration);
    }
}

// =========================================
// 6. RENDER SIDEBAR & KOLOM DINAMIS
// =========================================
function renderDynamicElements() {
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

    sidebarList.querySelectorAll('.dynamic-sidebar-label').forEach(el => {
        el.addEventListener('input', () => {
            const idx = parseInt(el.getAttribute('data-index'));
            extraSidebarItems[idx].label = el.innerHTML;
        });
    });

    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraSkills.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card glass-card interactive-card dynamic-col reveal visible';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="skill" data-index="${index}"><i class="fas fa-trash"></i></button>
            <div class="icon-badge icon-picker-trigger" title="Klik untuk ganti ikon">
                <i class="${col.icon || 'fas fa-microchip'} dynamic-icon" data-array="extraSkills" data-index="${index}"></i>
            </div>
            <h3 class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        skillsGrid.appendChild(card);
    });

    const projectsGrid = document.getElementById('projectsGrid');
    projectsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraProjects.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'project-card glass-card interactive-card dynamic-col reveal visible';
        card.setAttribute('data-category', col.category || 'mikrotik');
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="project" data-index="${index}"><i class="fas fa-trash"></i></button>
            <div class="project-header">
                <div class="icon-badge icon-picker-trigger" title="Klik untuk ganti ikon">
                    <i class="${col.icon || 'fas fa-project-diagram'} dynamic-icon" data-array="extraProjects" data-index="${index}"></i>
                </div>
                <span class="tag editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="tag">${col.tag}</span>
            </div>
            <h3 class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        projectsGrid.appendChild(card);
    });

    const customGrid = document.getElementById('customColumnsGrid');
    customGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraCustomCols.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card glass-card interactive-card dynamic-col reveal visible';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="custom" data-index="${index}"><i class="fas fa-trash"></i></button>
            <div class="icon-badge icon-picker-trigger" title="Klik untuk ganti ikon">
                <i class="${col.icon || 'fas fa-star'} dynamic-icon" data-array="extraCustomCols" data-index="${index}"></i>
            </div>
            <h3 class="editable dynamic-field" data-array="extraCustomCols" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraCustomCols" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        customGrid.appendChild(card);
    });

    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.currentTarget.getAttribute('data-type');
            const idx = parseInt(e.currentTarget.getAttribute('data-index'));
            if (type === 'skill') extraSkills.splice(idx, 1);
            if (type === 'project') extraProjects.splice(idx, 1);
            if (type === 'custom') extraCustomCols.splice(idx, 1);
            renderDynamicElements();
            saveAllToCloud();
        });
    });

    document.querySelectorAll('.dynamic-field').forEach(el => {
        el.addEventListener('input', () => {
            const arrName = el.getAttribute('data-array');
            const idx = parseInt(el.getAttribute('data-index'));
            const field = el.getAttribute('data-field');
            if (arrName === 'extraSkills') extraSkills[idx][field] = el.innerHTML;
            if (arrName === 'extraProjects') extraProjects[idx][field] = el.innerHTML;
            if (arrName === 'extraCustomCols') extraCustomCols[idx][field] = el.innerHTML;
        });
    });

    applyEditModeState();
    initMicrointeractions();
}

// =========================================
// 7. MUAT DATA, IKON & FOTO DARI CLOUD FIRESTORE
// =========================================
async function loadCloudContent() {
    try {
        const docSnap = await getDoc(portfolioDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();

            if (data.texts) {
                document.querySelectorAll('.editable[data-key]').forEach(el => {
                    const key = el.getAttribute('data-key');
                    if (data.texts[key]) {
                        el.innerHTML = data.texts[key];
                    }
                });
            }

            if (data.savedIcons) {
                savedIcons = data.savedIcons;
                Object.keys(savedIcons).forEach(key => {
                    const iconEl = document.querySelector(`.editable-icon[data-icon-key="${key}"]`);
                    if (iconEl) {
                        iconEl.className = `${savedIcons[key]} editable-icon`;
                    }
                });
            }

            extraSidebarItems = data.extraSidebarItems || [];
            extraSkills = data.extraSkills || [];
            extraProjects = data.extraProjects || [];
            extraCustomCols = data.extraCustomCols || [];
            renderDynamicElements();
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
// 8. KONTROL ADMIN RINGKAS (EDIT <-> SELESAI EDIT)
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

document.addEventListener('click', (e) => {
    if (isEditingMode && e.target.closest('.editable')) {
        const parentLink = e.target.closest('a');
        if (parentLink) e.preventDefault();
    }
});

adminLoginBtn.addEventListener('click', () => {
    loginModal.style.display = 'flex';
    adminEmailInput.focus();
});

document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById(btn.getAttribute('data-close')).style.display = 'none';
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

// =========================================
// 9. AKSI TAMBAH SIDEBAR & TAMBAH KOLOM
// =========================================
document.getElementById('openAddSidebarModal').addEventListener('click', () => {
    document.getElementById('addSidebarModal').style.display = 'flex';
});

document.getElementById('confirmAddSidebarBtn').addEventListener('click', () => {
    const label = document.getElementById('newSidebarLabel').value.trim();
    const link = document.getElementById('newSidebarLink').value.trim() || '#custom-columns';
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
        desc: "Klik teks ini untuk menuliskan deskripsi keahlian jaringan atau server."
    });
    renderDynamicElements();
    saveAllToCloud();
});

document.getElementById('addProjectColBtn').addEventListener('click', () => {
    extraProjects.push({
        icon: "fas fa-project-diagram",
        category: "mikrotik",
        tag: "Praktikum",
        title: "Judul Proyek Baru",
        desc: "Klik teks ini untuk menjelaskan konfigurasi dan hasil pengujian proyek."
    });
    renderDynamicElements();
    saveAllToCloud();
});

document.getElementById('addCustomColBtn').addEventListener('click', () => {
    extraCustomCols.push({
        icon: "fas fa-star",
        title: "Kolom Informasi Baru",
        desc: "Klik teks ini untuk mengisi konten tambahan."
    });
    renderDynamicElements();
    saveAllToCloud();
});

// =========================================
// 10. UPLOAD GAMBAR LANGSUNG KE CLOUD FIRESTORE (GRATIS)
// =========================================
function setupFirestoreImageUpload(inputId, mediaKey, maxWidth, applyCallback) {
    const inputEl = document.getElementById(inputId);

    inputEl.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!currentUser) {
            alert("Sesi admin tidak ditemukan. Silakan login ulang.");
            return;
        }

        if (!file.type.startsWith('image/')) {
            return alert("Harap pilih file gambar yang valid (JPG, PNG, WEBP).");
        }

        const instantUrl = URL.createObjectURL(file);
        applyCallback(instantUrl);
        showToast("Memproses & menyimpan foto ke Cloud...", 0);

        try {
            const optimizedDataUrl = await compressImageForFirestore(file, maxWidth, 0.85);
            await saveMediaToFirestore(mediaKey, optimizedDataUrl);

            applyCallback(optimizedDataUrl);
            showToast("Foto berhasil tersimpan di Cloud!", 3000);
        } catch (error) {
            console.error("Gagal menyimpan foto ke Firestore:", error);
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

// =========================================
// 11. SIDEBAR MOBILE & FILTER PROYEK
// =========================================
const sidebar = document.getElementById('sidebar');
document.getElementById('openSidebarBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
});
document.getElementById('closeSidebarBtn').addEventListener('click', () => {
    sidebar.classList.remove('open');
});

document.querySelectorAll('.filter-btn').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        const filterValue = button.getAttribute('data-filter');

        document.querySelectorAll('.project-card').forEach(card => {
            if (filterValue === 'all' || card.getAttribute('data-category') === filterValue) {
                card.classList.remove('hide');
            } else {
                card.classList.add('hide');
            }
        });
    });
});

document.getElementById('contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    showToast(`Terima kasih, ${name}! Pesan terkirim.`);
    e.target.reset();
});

document.addEventListener('DOMContentLoaded', () => {
    initIconPicker();
    initMicrointeractions();
    loadCloudContent();
});