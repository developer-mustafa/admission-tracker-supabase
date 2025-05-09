document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase client
  const supabaseUrl = 'https://erihbeinkymnymncnawm.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyaWhiZWlua3ltbnltbmNuYXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY3NzEwMzUsImV4cCI6MjA2MjM0NzAzNX0.xhE0_RbBQ9qQcYHa5sv-S9-cUolJruo0Km3oud-GtOM';
  const supabaseMain = supabase.createClient(supabaseUrl, supabaseKey);

  // DOM references
  const studentForm = document.getElementById("studentForm");
  const studentList = document.getElementById("studentList");
  const darkModeToggle = document.getElementById("darkModeToggle");
  const darkModeText = document.getElementById("darkModeText");
  const exportCSVButton = document.getElementById("exportCSV");
  const backupJSONButton = document.getElementById("backupJSON");
  const restoreJSONInput = document.getElementById("restoreJSON");
  const importCSVInput = document.getElementById("importCSV");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const clearFiltersButton = document.getElementById("clearFilters");

  // Dashboard elements
  const totalStudentsElement = document.getElementById("totalStudents");
  const paidStudentsElement = document.getElementById("paidStudents");
  const followupStudentsElement = document.getElementById("followupStudents");
  const noneStudentsElement = document.getElementById("noneStudents");

  // Search and filter elements
  const searchData = document.getElementById("searchData");
  const searchStatus = document.getElementById("searchStatus");

  // Modal elements
  const studentModal = document.getElementById("studentModal");
  const modalTitle = document.getElementById("modalTitle");
  const editStudentForm = document.getElementById("editStudentForm");
  const editName = document.getElementById("editName");
  const editPhone = document.getElementById("editPhone");
  const editGroup = document.getElementById("editGroup");
  const editDate = document.getElementById("editDate");
  const editStatus = document.getElementById("editStatus");
  const cancelEdit = document.getElementById("cancelEdit");

  // Delete modal elements
  const deleteModal = document.getElementById("deleteModal");
  const cancelDelete = document.getElementById("cancelDelete");
  const confirmDelete = document.getElementById("confirmDelete");

  // Status configuration: icon and color classes for each status
  const statusConfig = {
    "not_Checked": {
      icon: `<i class="fas fa-circle-notch text-gray-500 mr-1"></i>`,
      classes: "bg-gray-200 border border-gray-400 text-gray-700 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300"
    },
    "None": {
      icon: `<i class="fas fa-ban text-red-500 mr-1"></i>`,
      classes: "bg-gray-800 border border-red-500 text-red-100 dark:bg-gray-900 dark:border-red-600 dark:text-red-200"
    },
    "Called": {
      icon: `<i class="fas fa-phone-alt text-blue-600 mr-1"></i>`,
      classes: "bg-blue-100 border border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200"
    },
    "Follow-Up Needed": {
      icon: `<i class="fas fa-exclamation-circle text-red-600 mr-1"></i>`,
      classes: "bg-red-100 border border-red-500 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200"
    },
    "Agreed": {
      icon: `<i class="fas fa-check-circle text-green-600 mr-1"></i>`,
      classes: "bg-green-100 border border-green-500 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-200"
    },
    "Confirmed": {
      icon: `<i class="fas fa-check-double text-yellow-600 mr-1"></i>`,
      classes: "bg-yellow-100 border border-yellow-500 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200"
    },
    "Paid": {
      icon: `<i class="fas fa-check-circle text-green-100 mr-1"></i>`,
      classes: "bg-green-800 border border-green-600 text-green-50 dark:bg-green-900 dark:border-green-700 dark:text-green-100"
    }
  };

  // Initialize students array
  let students = [];
  let editingId = null;
  let deletingId = null;

  // Chart variables
  let statusChart, groupChart, deptChart;
  const ctxStatus = document.getElementById("statusChart").getContext("2d");
  const ctxGroup = document.getElementById("groupChart").getContext("2d");
  const ctxDept = document.getElementById("deptChart").getContext("2d");

  // Show loading overlay
  const showLoading = () => {
    loadingOverlay.classList.remove("hidden");
  };

  // Hide loading overlay
  const hideLoading = () => {
    loadingOverlay.classList.add("hidden");
  };

  // Fetch students from Supabase
  const fetchStudents = async () => {
    showLoading();
    try {
      const { data, error } = await supabaseMain
        .from('students')
        .select('*')
        .order('date', { ascending: false }); // Changed from created_at to date

      if (error) throw error;

      students = data || [];
      saveStudentsToLocal();
      renderStudents();
      updateDashboard();
      updateCharts();
    } catch (error) {
      console.error('Error fetching students:', error);
      // Fallback to local storage if Supabase fails
      students = JSON.parse(localStorage.getItem("students")) || [];
      renderStudents();
      updateDashboard();
      updateCharts();
    } finally {
      hideLoading();
    }
  };

  // Save students to local storage as backup
  const saveStudentsToLocal = () => {
    localStorage.setItem("students", JSON.stringify(students));
  };

  // Add student to Supabase
  const addStudent = async (student) => {
    showLoading();
    try {
      const { data, error } = await supabaseMain
        .from('students')
        .insert([student])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        students.unshift(data[0]); // Add new student to beginning of array
        saveStudentsToLocal();
        renderStudents();
        updateDashboard();
        updateCharts();
      }
    } catch (error) {
      console.error('Error adding student:', error);
      // Fallback to local storage
      students.unshift(student);
      saveStudentsToLocal();
      renderStudents();
      updateDashboard();
      updateCharts();
    } finally {
      hideLoading();
    }
  };

  // Update student in Supabase
  const updateStudent = async (id, updates) => {
    showLoading();
    try {
      const { data, error } = await supabaseMain
        .from('students')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        const index = students.findIndex(s => s.id === id);
        if (index !== -1) {
          students[index] = data[0];
          saveStudentsToLocal();
          renderStudents();
          updateDashboard();
          updateCharts();
        }
      }
    } catch (error) {
      console.error('Error updating student:', error);
      // Fallback to local storage
      const index = students.findIndex(s => s.id === id);
      if (index !== -1) {
        students[index] = { ...students[index], ...updates };
        saveStudentsToLocal();
        renderStudents();
        updateDashboard();
        updateCharts();
      }
    } finally {
      hideLoading();
    }
  };

  // Delete student from Supabase
  const deleteStudent = async (id) => {
    showLoading();
    try {
      const { error } = await supabaseMain
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      students = students.filter(student => student.id !== id);
      saveStudentsToLocal();
      renderStudents();
      updateDashboard();
      updateCharts();
    } catch (error) {
      console.error('Error deleting student:', error);
      // Fallback to local storage
      students = students.filter(student => student.id !== id);
      saveStudentsToLocal();
      renderStudents();
      updateDashboard();
      updateCharts();
    } finally {
      hideLoading();
    }
  };

  // Update dashboard summary
  const updateDashboard = () => {
    const total = students.length;
    const paid = students.filter(s => s.status === 'Paid').length;
    const followup = students.filter(s => s.status === 'Follow-Up Needed').length;
    const none = students.filter(s => s.status === 'None').length;

    totalStudentsElement.textContent = total;
    paidStudentsElement.textContent = paid;
    followupStudentsElement.textContent = followup;
    noneStudentsElement.textContent = none;
  };

  // Debounce helper for filtering
  const debounce = (func, delay) => {
    let debounceTimer;
    return function (...args) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(this, args), delay);
    }
  };

  // Render the student grid (as responsive cards)
  const renderStudents = () => {
    const searchTerm = searchData.value.toLowerCase();
    const filterStatus = searchStatus.value;

    studentList.innerHTML = "";

    // Show loading state
    if (students.length === 0) {
      studentList.innerHTML = `
                        <div class="col-span-full text-center py-10">
                            <i class="fas fa-user-graduate text-4xl text-gray-400 mb-4"></i>
                            <p class="text-gray-500 dark:text-gray-400">No students found. Add your first student above.</p>
                        </div>
                    `;
      return;
    }

    const filteredStudents = students.filter(student => {
      // Apply status filter if selected
      if (filterStatus && student.status !== filterStatus) return false;

      // Apply search term if provided
      if (searchTerm) {
        return (
          student.name.toLowerCase().includes(searchTerm) ||
          student.phone.toLowerCase().includes(searchTerm) ||
          student.group.toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });

    if (filteredStudents.length === 0) {
      studentList.innerHTML = `
                        <div class="col-span-full text-center py-10">
                            <i class="fas fa-search text-4xl text-gray-400 mb-4"></i>
                            <p class="text-gray-500 dark:text-gray-400">No students match your search criteria.</p>
                        </div>
                    `;
      return;
    }

    filteredStudents.forEach((student) => {
      const config = statusConfig[student.status] || {
        icon: '<i class="fas fa-question-circle text-gray-600 mr-1"></i>',
        classes: 'bg-gray-100 border border-gray-300 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
      };

      const card = document.createElement("div");
      card.className = `p-6 border-l-4 ${config.classes} shadow hover:shadow-lg transition-all rounded-xl flex flex-col`;
      card.innerHTML = `
                        <div class="flex-grow">
                            <div class="flex justify-between items-center mb-3">
                                <h3 class="text-xl font-bold">${student.name}</h3>
                                <div class="flex items-center">
                                    ${config.icon}
                                    <span class="ml-1 text-sm font-medium">${student.status}</span>
                                </div>
                            </div>
                            <div class="mb-4 text-sm">
                                <p class="mb-1"><span class="font-medium">Phone:</span> ${student.phone}</p>
                                <p class="mb-1"><span class="font-medium">Group:</span> ${student.group}</p>
                                <p><span class="font-medium">Date:</span> ${student.date}</p>
                            </div>
                        </div>
                        <div class="flex space-x-2 mt-auto">
                            <a href="tel:${student.phone}" class="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-300 focus:outline-none focus:ring flex items-center justify-center">
                                <i class="fas fa-phone mr-2"></i> Call
                            </a>
                            <button onclick="openEditModal('${student.id}')" class="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-300 focus:outline-none focus:ring flex items-center justify-center">
                                <i class="fas fa-edit mr-2"></i> Edit
                            </button>
                            <button onclick="showDeleteModal('${student.id}')" class="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-300 focus:outline-none focus:ring flex items-center justify-center">
                                <i class="fas fa-trash mr-2"></i> Delete
                            </button>
                        </div>
                    `;
      studentList.appendChild(card);
    });
  };

  // Add new student record
  studentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const group = document.getElementById("group").value.trim();
    const date = document.getElementById("date").value;
    const status = document.getElementById("status").value;

    if (name && phone && group && date) {
      const newStudent = { name, phone, group, date, status };
      addStudent(newStudent);
      studentForm.reset();
    }
  });

  // Delete a student record
  window.showDeleteModal = (id) => {
    deletingId = id;
    deleteModal.classList.remove("hidden");
  };

  // Confirm deletion
  confirmDelete.addEventListener("click", () => {
    deleteStudent(deletingId);
    deleteModal.classList.add("hidden");
    deletingId = null;
  });

  // Cancel deletion
  cancelDelete.addEventListener("click", () => {
    deleteModal.classList.add("hidden");
    deletingId = null;
  });

  // Open edit modal
  window.openEditModal = (id) => {
    const student = students.find(s => s.id === id);
    if (student) {
      editingId = id;
      modalTitle.textContent = `Edit: ${student.name}`;
      editName.value = student.name;
      editPhone.value = student.phone;
      editGroup.value = student.group;
      editDate.value = student.date;
      editStatus.value = student.status;
      studentModal.classList.remove("hidden");
    }
  };

  // Close modal
  const closeModal = () => {
    studentModal.classList.add("hidden");
    editingId = null;
  };

  // Save edits
  editStudentForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (editingId !== null) {
      const updates = {
        name: editName.value.trim(),
        phone: editPhone.value.trim(),
        group: editGroup.value.trim(),
        date: editDate.value,
        status: editStatus.value
      };
      updateStudent(editingId, updates);
      closeModal();
    }
  });
  cancelEdit.addEventListener("click", closeModal);

  // Clear all filters
  clearFiltersButton.addEventListener("click", () => {
    searchData.value = "";
    searchStatus.value = "";
    renderStudents();
  });

  // Apply debounced filtering
  const handleSearch = debounce(renderStudents, 300);
  searchData.addEventListener("input", handleSearch);
  searchStatus.addEventListener("change", handleSearch);

  // CSV Export
  exportCSVButton.addEventListener("click", () => {
    showLoading();
    setTimeout(() => {
      let csvContent = "data:text/csv;charset=utf-8,Name,Phone,Group,Date,Status\n";
      students.forEach(student => {
        const row = [student.name, student.phone, student.group, student.date, student.status].join(",");
        csvContent += row + "\n";
      });
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "students.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      hideLoading();
    }, 500);
  });

  // Backup JSON Export
  backupJSONButton.addEventListener("click", () => {
    showLoading();
    setTimeout(() => {
      const dataStr = JSON.stringify(students, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "students_backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      hideLoading();
    }, 500);
  });

  // Restore JSON Import
  restoreJSONInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showLoading();
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const data = JSON.parse(event.target.result);
          if (Array.isArray(data)) {
            // Clear existing data first
            students = [];
            saveStudentsToLocal();

            // Add each student to Supabase
            data.forEach(student => {
              addStudent(student);
            });
          } else {
            alert("Invalid file format.");
          }
        } catch (err) {
          alert("Error parsing JSON.");
        }
        hideLoading();
      }, 500);
    };
    reader.readAsText(file);
  });

  // CSV Import
  importCSVInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    showLoading();
    const reader = new FileReader();
    reader.onload = (event) => {
      setTimeout(() => {
        try {
          const text = event.target.result;
          const lines = text.split("\n").filter(line => line.trim() !== "");
          let startIndex = 0;
          if (lines[0].toLowerCase().includes("name")) startIndex = 1;

          const newStudents = [];
          for (let i = startIndex; i < lines.length; i++) {
            const cols = lines[i].split(",");
            if (cols.length < 5) continue;
            const [name, phone, group, date, status] = cols.map(item => item.trim());
            if (name && phone && group && date && status) {
              newStudents.push({ name, phone, group, date, status });
            }
          }

          if (newStudents.length > 0) {
            // Clear existing data first
            students = [];
            saveStudentsToLocal();

            // Add each student to Supabase
            newStudents.forEach(student => {
              addStudent(student);
            });
          } else {
            alert("No valid student records found in CSV.");
          }
        } catch (err) {
          alert("Error parsing CSV.");
        }
        hideLoading();
      }, 500);
    };
    reader.readAsText(file);
  });


// Dark mode toggle with smooth capsule-style switch
darkModeToggle.addEventListener("click", () => {
  const isDark = document.documentElement.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark);

  // Move thumb and update emoji
  if (isDark) {
    toggleThumb.classList.add("translate-x-8");
    toggleThumb.classList.remove("translate-x-0");
    toggleIcon.textContent = '☀️';
  } else {
    toggleThumb.classList.add("translate-x-0");
    toggleThumb.classList.remove("translate-x-8");
    toggleIcon.textContent = '🌙';
  }

  if (typeof updateCharts === 'function') updateCharts();
});

// Initialize dark mode if previously set
if (localStorage.getItem("darkMode") === "true") {
  document.documentElement.classList.add("dark");
  toggleThumb.classList.add("translate-x-8");
  toggleIcon.textContent = '☀️';
} else {
  toggleThumb.classList.add("translate-x-0");
  toggleIcon.textContent = '🌙';
}



  const updateCharts = () => {
    const statusCounts = { "not_Checked": 0, "None": 0, "Called": 0, "Follow-Up Needed": 0, "Agreed": 0, "Confirmed": 0, "Paid": 0 };
    const groupCounts = {};
    const deptCounts = { "Science": 0, "Commerce": 0, "Arts": 0 };

    students.forEach(student => {
      if (statusCounts.hasOwnProperty(student.status)) {
        statusCounts[student.status]++;
      }
      groupCounts[student.group] = (groupCounts[student.group] || 0) + 1;
      const groupLower = student.group.trim().toLowerCase();
      if (groupLower === "science") deptCounts["Science"]++;
      else if (groupLower === "commerce") deptCounts["Commerce"]++;
      else if (groupLower === "arts") deptCounts["Arts"]++;
    });

    // Define color mapping for all statuses
    const statusColors = {
      'not_Checked': { bg: '#9CA3AF', border: '#6B7280' },  // Gray
      'None': { bg: '#36454F', border: '#B91C1C' },         // black
      'Called': { bg: '#DBEAFE', border: '#1E40AF' },       // Blue
      'Follow-Up Needed': { bg: '#FEE2E2', border: '#92400E' }, //red
      'Agreed': { bg: '#7ff09b', border: '#065F46' },       //soft Green
      'Confirmed': { bg: '#FEF9C3', border: '#5B21B6' },    //deep offwhite
      'Paid': { bg: '#06c635', border: '#047857' }          // deep Green
    };

    // Destroy existing charts if they exist
    if (statusChart) statusChart.destroy();
    if (groupChart) groupChart.destroy();
    if (deptChart) deptChart.destroy();

    // Pie Chart: Status Distribution
    statusChart = new Chart(ctxStatus, {
      type: 'pie',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          label: 'Status Distribution',
          data: Object.values(statusCounts),
          backgroundColor: Object.keys(statusCounts).map(status => statusColors[status].bg),
          borderColor: Object.keys(statusCounts).map(status => statusColors[status].border),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151',
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 20
            }
          },
          tooltip: {
            backgroundColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
            titleColor: document.documentElement.classList.contains('dark') ? '#F9FAFB' : '#111827',
            bodyColor: document.documentElement.classList.contains('dark') ? '#E5E7EB' : '#374151',
            borderColor: document.documentElement.classList.contains('dark') ? '#4B5563' : '#D1D5DB',
            borderWidth: 1
          }
        }
      }
    });

    // Bar Chart: Group Distribution (3D Style)
    const getGroupColors = (count) => {
      const lightModeColors = [
        'rgba(96, 165, 250, 0.9)',  // blue with transparency
        'rgba(52, 211, 153, 0.9)',  // emerald
        'rgba(251, 191, 36, 0.9)',   // amber
        'rgba(129, 140, 248, 0.9)',  // indigo
        'rgba(248, 113, 113, 0.9)',  // red
      ];
      const darkModeColors = [
        'rgba(96, 165, 250, 0.9)',   // blue
        'rgba(52, 211, 153, 0.9)',   // emerald
        'rgba(251, 191, 36, 0.9)',    // amber
        'rgba(129, 140, 248, 0.9)',   // indigo
        'rgba(248, 113, 113, 0.9)',   // red
      ];
      return document.documentElement.classList.contains('dark')
        ? darkModeColors.slice(0, count)
        : lightModeColors.slice(0, count);
    };

    groupChart = new Chart(ctxGroup, {
      type: 'bar',
      data: {
        labels: Object.keys(groupCounts),
        datasets: [{
          label: 'Group Distribution',
          data: Object.values(groupCounts),
          backgroundColor: getGroupColors(Object.keys(groupCounts).length),
          borderColor: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0
          },
          barThickness: 40,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark')
                ? '#E2E8F0'
                : '#1E293B',
              font: {
                size: 12,
                weight: '500'
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: document.documentElement.classList.contains('dark')
              ? '#1E293B'
              : '#FFFFFF',
            titleColor: document.documentElement.classList.contains('dark')
              ? '#F8FAFC'
              : '#1E293B',
            bodyColor: document.documentElement.classList.contains('dark')
              ? '#E2E8F0'
              : '#475569',
            borderColor: '#64748B',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} students`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: document.documentElement.classList.contains('dark')
                ? '#94A3B8'
                : '#475569',
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          y: {
            grid: {
              color: document.documentElement.classList.contains('dark')
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
              drawBorder: false,
              borderDash: [4, 4]
            },
            ticks: {
              color: document.documentElement.classList.contains('dark')
                ? '#94A3B8'
                : '#475569',
              font: {
                size: 12,
                weight: '500'
              },
              callback: function (value) {
                return Number.isInteger(value) ? value : '';
              }
            },
            beginAtZero: true
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });

    // Bar Chart: Department Distribution
    deptChart = new Chart(ctxDept, {
      type: 'bar',
      data: {
        labels: Object.keys(deptCounts),
        datasets: [{
          label: 'Department Distribution',
          data: Object.values(deptCounts),
          backgroundColor: [
            'rgba(96, 165, 250, 0.9)',
            'rgba(52, 211, 153, 0.9)',
            'rgba(129, 140, 248, 0.9)'
          ],
          borderColor: document.documentElement.classList.contains('dark')
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          borderRadius: {
            topLeft: 6,
            topRight: 6,
            bottomLeft: 0,
            bottomRight: 0
          },
          barThickness: 40,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: document.documentElement.classList.contains('dark')
                ? '#E2E8F0'
                : '#1E293B',
              font: {
                size: 12,
                weight: '500'
              },
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle'
            }
          },
          tooltip: {
            backgroundColor: document.documentElement.classList.contains('dark')
              ? '#1E293B'
              : '#FFFFFF',
            titleColor: document.documentElement.classList.contains('dark')
              ? '#F8FAFC'
              : '#1E293B',
            bodyColor: document.documentElement.classList.contains('dark')
              ? '#E2E8F0'
              : '#475569',
            borderColor: '#64748B',
            borderWidth: 1,
            cornerRadius: 6,
            padding: 12,
            displayColors: true,
            callbacks: {
              label: function (context) {
                return `${context.parsed.y} students`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false,
              drawBorder: false
            },
            ticks: {
              color: document.documentElement.classList.contains('dark')
                ? '#94A3B8'
                : '#475569',
              font: {
                size: 12,
                weight: '500'
              }
            }
          },
          y: {
            grid: {
              color: document.documentElement.classList.contains('dark')
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)',
              drawBorder: false,
              borderDash: [4, 4]
            },
            ticks: {
              color: document.documentElement.classList.contains('dark')
                ? '#94A3B8'
                : '#475569',
              font: {
                size: 12,
                weight: '500'
              },
              callback: function (value) {
                return Number.isInteger(value) ? value : '';
              }
            },
            beginAtZero: true
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        }
      }
    });
  };

  // Initial fetch of students
 


 
  fetchStudents();
});
