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

// Pastikan sesi admin tersimpan permanen di browser (tidak perlu login ulang)
setPersistence(auth, browserLocalPersistence);

const portfolioDocRef = doc(db, "portfolio", "mainData");

// State struktur dinamis (Sidebar & Kolom tambahan)
let extraSidebarItems = [];
let extraSkills = [];
let extraProjects = [];
let extraCustomCols = [];

// =========================================
// 2. RENDER SIDEBAR & KOLOM DINAMIS
// =========================================
function renderDynamicElements() {
    // 1. Render Item Sidebar Tambahan
    const sidebarList = document.getElementById('sidebarLinks');
    sidebarList.querySelectorAll('.dynamic-sidebar-item').forEach(el => el.remove());

    extraSidebarItems.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'dynamic-sidebar-item';
        li.innerHTML = `
            <a href="${item.link}">
                <i class="${item.icon}"></i> <span>${item.label}</span>
            </a>
            <button class="edit-only-box delete-sidebar-item" data-index="${index}" title="Hapus Menu">&times;</button>
        `;
        sidebarList.appendChild(li);
    });

    // Event hapus sidebar item
    sidebarList.querySelectorAll('.delete-sidebar-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.target.getAttribute('data-index'));
            extraSidebarItems.splice(idx, 1);
            renderDynamicElements();
        });
    });

    // 2. Render Kolom Keahlian Tambahan
    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraSkills.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card dynamic-col';
        card.innerHTML = `
            <button class="edit-only-box delete-card-btn" data-type="skill" data-index="${index}">&times;</button>
            <i class="fas fa-microchip"></i>
            <h3 class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraSkills" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        skillsGrid.appendChild(card);
    });

    // 3. Render Kolom Proyek Tambahan
    const projectsGrid = document.getElementById('projectsGrid');
    projectsGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraProjects.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'project-card dynamic-col';
        card.setAttribute('data-category', col.category || 'mikrotik');
        card.innerHTML = `
            <button class="edit-only-box delete-card-btn" data-type="project" data-index="${index}">&times;</button>
            <div class="project-header">
                <i class="fas fa-project-diagram"></i>
                <span class="tag editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="tag">${col.tag}</span>
            </div>
            <h3 class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraProjects" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        projectsGrid.appendChild(card);
    });

    // 4. Render Kolom Bebas Tambahan
    const customGrid = document.getElementById('customColumnsGrid');
    customGrid.querySelectorAll('.dynamic-col').forEach(el => el.remove());
    extraCustomCols.forEach((col, index) => {
        const card = document.createElement('div');
        card.className = 'skill-card dynamic-col';
        card.innerHTML = `
            <button class="edit-only-box delete-card-btn" data-type="custom" data-index="${index}">&times;</button>
            <i class="fas fa-star"></i>
            <h3 class="editable dynamic-field" data-array="extraCustomCols" data-index="${index}" data-field="title">${col.title}</h3>
            <p class="editable dynamic-field" data-array="extraCustomCols" data-index="${index}" data-field="desc">${col.desc}</p>
        `;
        customGrid.appendChild(card);
    });

    // Pasang listener hapus kolom
    document.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.getAttribute('data-type');
            const idx = parseInt(e.target.getAttribute('data-index'));
            if (type === 'skill') extraSkills.splice(idx, 1);
            if (type === 'project') extraProjects.splice(idx, 1);
            if (type === 'custom') extraCustomCols.splice(idx, 1);
            renderDynamicElements();
        });
    });

    // Sinkronkan perubahan teks langsung ke array saat diedit
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

    // Terapkan status contenteditable sesuai mode saat ini
    setEditMode(editModeToggle.checked);
}

// =========================================
// 3. MUAT DATA DARI FIRESTORE SAAT WEB DIBUKA
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
// 4. SESI LOGIN OTOMATIS & SAKELAR EDIT/VIEW
// =========================================
const adminLoginBtn = document.getElementById('adminLoginBtn');
const loginModal = document.getElementById('loginModal');
const submitLoginBtn = document.getElementById('submitLoginBtn');
const adminEmailInput = document.getElementById('adminEmailInput');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const adminPanel = document.getElementById('adminPanel');
const logoutAdminBtn = document.getElementById('logoutAdminBtn');
const editModeToggle = document.getElementById('editModeToggle');
const editStatusText = document.getElementById('editStatusText');
const uploadProgressText = document.getElementById('uploadProgressText');

let currentUser = null;

// Jika sudah pernah login, otomatis masuk Mode Admin & langsung aktifkan Mode Edit
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    if (user) {
        adminPanel.classList.remove('hidden');
        setEditMode(true); // Langsung siap edit tanpa perlu klik apa pun
    } else {
        adminPanel.classList.add('hidden');
        setEditMode(false);
    }
});

adminLoginBtn.addEventListener('click', () => {
    if (currentUser) {
        adminPanel.classList.toggle('hidden');
    } else {
        loginModal.style.display = 'flex';
        adminEmailInput.focus();
    }
});

// Tutup modal apa pun
document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        document.getElementById(modalId).style.display = 'none';
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

// Sakelar Bebas Pindah Mode Edit <-> Mode View
function setEditMode(enabled) {
    editModeToggle.checked = enabled;
    const editables = document.querySelectorAll('.editable');
    
    if (enabled) {
        document.body.classList.add('editing-active');
        editables.forEach(el => el.setAttribute('contenteditable', 'true'));
        editStatusText.textContent = 'Status: Mode Edit Aktif (Bebas ubah teks & tambah kolom)';
        editStatusText.style.color = '#00ff88';
    } else {
        document.body.classList.remove('editing-active');
        editables.forEach(el => el.removeAttribute('contenteditable'));
        editStatusText.textContent = 'Status: Mode View (Tampilan pengunjung bersih)';
        editStatusText.style.color = '#00f2fe';
    }
}

editModeToggle.addEventListener('change', (e) => {
    setEditMode(e.target.checked);
});

// =========================================
// 5. AKSI TAMBAH SIDEBAR & TAMBAH KOLOM
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
});

document.getElementById('addSkillColBtn').addEventListener('click', () => {
    extraSkills.push({
        title: "Keahlian Baru (Klik Edit)",
        desc: "Klik teks ini untuk menuliskan deskripsi keahlian jaringan atau server baru."
    });
    renderDynamicElements();
});

document.getElementById('addProjectColBtn').addEventListener('click', () => {
    extraProjects.push({
        category: "mikrotik",
        tag: "Praktikum Baru",
        title: "Judul Proyek Baru",
        desc: "Klik di sini untuk menjelaskan topologi, konfigurasi, dan hasil pengujian proyek."
    });
    renderDynamicElements();
});

document.getElementById('addCustomColBtn').addEventListener('click', () => {
    extraCustomCols.push({
        title: "Kolom Informasi Baru",
        desc: "Klik di sini untuk mengisi konten kolom tambahan (sertifikat, penghargaan, atau pengalaman PKL)."
    });
    renderDynamicElements();
});

// =========================================
// 6. SIMPAN SEMUA KE CLOUD FIRESTORE & STORAGE
// =========================================
document.getElementById('saveChangesBtn').addEventListener('click', async () => {
    if (!currentUser) return;

    const btn = document.getElementById('saveChangesBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

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
        alert("Semua perubahan (teks, sidebar, dan kolom baru) berhasil disimpan ke Firebase Cloud!");
    } catch (error) {
        alert("Gagal menyimpan: " + error.message);
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> Simpan Semua';
    }
});

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
                uploadProgressText.textContent = `Mengunggah ${mediaKey}: ${progress}%...`;
            },
            (error) => {
                uploadProgressText.textContent = "";
                alert("Gagal mengunggah gambar: " + error.message);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                await setDoc(portfolioDocRef, {
                    media: { [mediaKey]: downloadURL }
                }, { merge: true });

                applyCallback(downloadURL);
                uploadProgressText.textContent = "Foto HD berhasil diperbarui di Cloud!";
                setTimeout(() => { uploadProgressText.textContent = ""; }, 4000);
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
// 7. SIDEBAR MOBILE, TYPING & FILTER PROYEK
// =========================================
const sidebar = document.getElementById('sidebar');
document.getElementById('openSidebarBtn').addEventListener('click', () => {
    sidebar.classList.add('open');
});
document.getElementById('closeSidebarBtn').addEventListener('click', () => {
    sidebar.classList.remove('open');
});

const typingText = document.querySelector('.typing-text');
const roles = [
    "Teknik Jaringan Komputer & Telekomunikasi",
    "Network Administrator",
    "Linux System Administrator",
    "Fiber Optic Technician"
];

let roleIndex = 0, charIndex = 0, isDeleting = false;

function typeEffect() {
    const currentRole = roles[roleIndex];
    typingText.textContent = isDeleting 
        ? currentRole.substring(0, --charIndex) 
        : currentRole.substring(0, ++charIndex);

    let typeSpeed = isDeleting ? 50 : 100;
    if (!isDeleting && charIndex === currentRole.length) {
        typeSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        roleIndex = (roleIndex + 1) % roles.length;
        typeSpeed = 500;
    }
    setTimeout(typeEffect, typeSpeed);
}

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
    alert(`Terima kasih, ${name}! Pesan Anda telah terkirim.`);
    e.target.reset();
});

document.addEventListener('DOMContentLoaded', () => {
    loadCloudContent();
    typeEffect();
});