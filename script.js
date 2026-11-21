// =========================================
// 1. IMPORT & INISIALISASI FIREBASE SDK
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
import { 
    getStorage, 
    ref, 
    uploadBytesResumable, 
    getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

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
const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence);
const portfolioDocRef = doc(db, "portfolio", "mainData");

let extraSidebarItems = [];
let extraSkills = [];
let extraProjects = [];
let extraCustomCols = [];
let isEditingMode = false;
let currentUser = null;

// =========================================
// 2. MICROINTERACTIONS ENGINE (TILT, GLARE, REVEAL)
// =========================================
function initMicrointeractions() {
    // 1. Efek 3D Tilt & Cursor Glare pada Kartu Kaca
    document.querySelectorAll('.interactive-card').forEach(card => {
        if (card.dataset.tiltBound) return;
        card.dataset.tiltBound = "true";

        card.addEventListener('mousemove', (e) => {
            if (isEditingMode) return; // Nonaktifkan tilt saat mengetik agar nyaman
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

    // 2. Efek Magnetic ringan pada tombol utama
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

    // 3. Scroll Reveal Animation
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

// Scroll-Spy Sidebar (Menandai menu aktif sesuai posisi gulir)
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
// 3. SIMPAN OTOMATIS KE CLOUD FIRESTORE
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
            extraSidebarItems,
            extraSkills,
            extraProjects,
            extraCustomCols
        }, { merge: true });

        if (showAlert) {
            showToast("Semua perubahan tersimpan!");
        }
    } catch (error) {
        console.error("Gagal menyimpan ke Cloud:", error);
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
// 4. RENDER SIDEBAR & KOLOM DINAMIS
// =========================================
function renderDynamicElements() {
    const sidebarList = document.getElementById('sidebarLinks');
    sidebarList.querySelectorAll('.dynamic-sidebar-item').forEach(el => el.remove());

    extraSidebarItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'dynamic-sidebar-item';
        li.innerHTML = `
            <a href="${item.link}">
                <i class="${item.icon}"></i> <span class="editable dynamic-sidebar-label" data-index="${index}">${item.label}</span>
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

    // Render Kolom Keahlian Tambahan
    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraSkills.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card glass-card interactive-card dynamic-col reveal visible';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="skill" data-index="${index}"><i class="fas fa-trash"></i></button>
            <div class="icon-badge"><i class="fas fa-microchip"></i></div>
            <h3 class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        skillsGrid.appendChild(card);
    });

    // Render Kolom Proyek Tambahan
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
                <div class="icon-badge"><i class="fas fa-project-diagram"></i></div>
                <span class="tag editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="tag">${col.tag}</span>
            </div>
            <h3 class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        projectsGrid.appendChild(card);
    });

    // Render Kolom Bebas Tambahan
    const customGrid = document.getElementById('customColumnsGrid');
    customGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraCustomCols.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card glass-card interactive-card dynamic-col reveal visible';
        card.innerHTML = `
            <div class="card-glare"></div>
            <button class="edit-only-box delete-card-btn" data-type="custom" data-index="${index}"><i class="fas fa-trash"></i></button>
            <div class="icon-badge"><i class="fas fa-star"></i></div>
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
// 5. MUAT DATA DARI FIRESTORE
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

            if (data.media) {
                if (data.media.profileImage) {
                    document.getElementById('profileImage').src = data.media.profileImage;
                }
                if (data.media.bannerImage) {
                    document.getElementById('bannerImage').src = data.media.bannerImage;
                }
                if (data.media.bgImage) {
                    document.body.style.backgroundImage = `url('${data.media.bgImage}')`;
                }
            }

            extraSidebarItems = data.extraSidebarItems || [];
            extraSkills = data.extraSkills || [];
            extraProjects = data.extraProjects || [];
            extraCustomCols = data.extraCustomCols || [];
            renderDynamicElements();
        }
    } catch (error) {
        console.error("Gagal memuat data dari Firebase:", error);
    }
}

// =========================================
// 6. KONTROL ADMIN RINGKAS (EDIT <-> SELESAI EDIT)
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
// 7. AKSI TAMBAH SIDEBAR & TAMBAH KOLOM
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
        title: "Keahlian Baru",
        desc: "Klik teks ini untuk menuliskan deskripsi keahlian jaringan atau server."
    });
    renderDynamicElements();
    saveAllToCloud();
});

document.getElementById('addProjectColBtn').addEventListener('click', () => {
    extraProjects.push({
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
        title: "Kolom Informasi Baru",
        desc: "Klik teks ini untuk mengisi konten tambahan."
    });
    renderDynamicElements();
    saveAllToCloud();
});

// =========================================
// 8. UPLOAD GAMBAR RESOLUSI TINGGI (HD)
// =========================================
function setupFirebaseImageUpload(inputId, mediaKey, applyCallback) {
    const inputEl = document.getElementById(inputId);

    inputEl.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !currentUser) return;

        if (!file.type.startsWith('image/')) {
            return alert("Harap pilih file gambar yang valid.");
        }

        const storageRef = ref(storage, `portfolio_media/${mediaKey}_${Date.now()}_${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                showToast(`Mengunggah foto: ${progress}%...`, 0);
            },
            (error) => {
                document.getElementById('uploadToast').classList.add('hidden');
                alert("Gagal mengunggah gambar: " + error.message);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await setDoc(portfolioDocRef, {
                    media: { [mediaKey]: downloadURL }
                }, { merge: true });

                applyCallback(downloadURL);
                showToast("Foto HD berhasil disimpan!", 3000);
            }
        );
    });
}

setupFirebaseImageUpload('uploadBanner', 'bannerImage', (url) => {
    document.getElementById('bannerImage').src = url;
});
setupFirebaseImageUpload('uploadProfile', 'profileImage', (url) => {
    document.getElementById('profileImage').src = url;
});
setupFirebaseImageUpload('uploadBg', 'bgImage', (url) => {
    document.body.style.backgroundImage = `url('${url}')`;
});

document.getElementById('resetAllBtn').addEventListener('click', async () => {
    if (!currentUser) return;
    if (confirm("Yakin ingin mereset seluruh konten di Cloud ke pengaturan awal?")) {
        await deleteDoc(portfolioDocRef);
        location.reload();
    }
});

// =========================================
// 9. SIDEBAR MOBILE & FILTER PROYEK
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
    initMicrointeractions();
    loadCloudContent();
});