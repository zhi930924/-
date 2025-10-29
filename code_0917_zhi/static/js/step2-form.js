// 縣市區域對應資料
const cityDistrictMap = {
  "台北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
  "新北市": ["板橋區", "汐止區", "深坑區", "石碇區", "瑞芳區", "平溪區", "雙溪區", "貢寮區", "新店區", "坪林區", "烏來區", "永和區", "中和區", "土城區", "三峽區", "樹林區", "鶯歌區", "三重區", "新莊區", "泰山區", "林口區", "蘆洲區", "五股區", "八里區", "淡水區", "三芝區", "石門區"],
  "桃園市": ["中壢區", "平鎮區", "龍潭區", "楊梅區", "新屋區", "觀音區", "桃園區", "龜山區", "八德區", "大溪區", "復興區", "大園區", "蘆竹區"],
  "台中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"],
  "台南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"],
  "高雄市": ["新興區", "前金區", "苓雅區", "鹽埕區", "鼓山區", "旗津區", "前鎮區", "三民區", "楠梓區", "小港區", "左營區", "仁武區", "大社區", "岡山區", "路竹區", "阿蓮區", "田寮區", "燕巢區", "橋頭區", "梓官區", "彌陀區", "永安區", "湖內區", "鳳山區", "大寮區", "林園區", "鳥松區", "大樹區", "旗山區", "美濃區", "六龜區", "內門區", "杉林區", "甲仙區", "桃源區", "那瑪夏區", "茂林區", "茄萣區"]
};

// 郵遞區號對應表
const zipMap = {
  "台北市-中正區": "100", "台北市-大同區": "103", "台北市-中山區": "104", "台北市-松山區": "105",
  "台北市-大安區": "106", "台北市-萬華區": "108", "台北市-信義區": "110", "台北市-士林區": "111",
  "台北市-北投區": "112", "台北市-內湖區": "114", "台北市-南港區": "115", "台北市-文山區": "116",
  "新北市-板橋區": "220", "新北市-汐止區": "221", "新北市-深坑區": "222", "新北市-石碇區": "223",
  "新北市-瑞芳區": "224", "新北市-平溪區": "226", "新北市-雙溪區": "227", "新北市-貢寮區": "228",
  "新北市-新店區": "231", "新北市-坪林區": "232", "新北市-烏來區": "233", "新北市-永和區": "234",
  "新北市-中和區": "235", "新北市-土城區": "236", "新北市-三峽區": "237", "新北市-樹林區": "238",
  "新北市-鶯歌區": "239", "新北市-三重區": "241", "新北市-新莊區": "242", "新北市-泰山區": "243",
  "新北市-林口區": "244", "新北市-蘆洲區": "247", "新北市-五股區": "248", "新北市-八里區": "249",
  "新北市-淡水區": "251", "新北市-三芝區": "252", "新北市-石門區": "253",
  "桃園市-中壢區": "320", "桃園市-平鎮區": "324", "桃園市-龍潭區": "325", "桃園市-楊梅區": "326",
  "桃園市-新屋區": "327", "桃園市-觀音區": "328", "桃園市-桃園區": "330", "桃園市-龜山區": "333",
  "桃園市-八德區": "334", "桃園市-大溪區": "335", "桃園市-復興區": "336", "桃園市-大園區": "337",
  "桃園市-蘆竹區": "338"
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("Step2 表單功能已初始化");

  // ✅ 自動選取下拉選單預設值
  document.querySelectorAll("select[data-value]").forEach((select) => {
    const val = select.getAttribute("data-value");
    if (val) select.value = val;
  });

  // ✅ 縣市/區域/郵遞區號選單
  const citySelect = document.getElementById("address_city");
  const districtSelect = document.getElementById("address_district");
  const zipInput = document.getElementById("address_zip");

  if (citySelect && districtSelect && zipInput) {
    // 初始化縣市選單
    for (let city in cityDistrictMap) {
      const opt = document.createElement("option");
      opt.value = city;
      opt.textContent = city;
      citySelect.appendChild(opt);
    }

    // 縣市變更時更新區域
    citySelect.addEventListener("change", () => {
      const city = citySelect.value;
      districtSelect.innerHTML = '<option value="" disabled selected hidden>請選擇</option>';
      zipInput.value = "";

      if (cityDistrictMap[city]) {
        cityDistrictMap[city].forEach((district) => {
          const opt = document.createElement("option");
          opt.value = district;
          opt.textContent = district;
          districtSelect.appendChild(opt);
        });
      }

      // 如果有預設值，設定區域
      const preSelectedDistrict = districtSelect.getAttribute("data-value");
      if (preSelectedDistrict) {
        districtSelect.value = preSelectedDistrict;
        const key = `${city}-${preSelectedDistrict}`;
        zipInput.value = zipMap[key] || "";
      }
    });

    // 區域變更時更新郵遞區號
    districtSelect.addEventListener("change", () => {
      const key = `${citySelect.value}-${districtSelect.value}`;
      zipInput.value = zipMap[key] || "";
    });

    // 如果有預設縣市值，觸發變更事件
    const preSelectedCity = citySelect.getAttribute("data-value");
    if (preSelectedCity) {
      citySelect.value = preSelectedCity;
      citySelect.dispatchEvent(new Event('change'));
    }
  }

  // ✅ 「其他」欄位顯示控制
  const toggleOtherField = (selectId, otherInputId) => {
    const select = document.getElementById(selectId);
    const otherInput = document.getElementById(otherInputId);
    if (select && otherInput) {
      const toggle = () => {
        otherInput.style.display = select.value === "其他" ? "block" : "none";
      };
      select.addEventListener("change", toggle);
      toggle();
    }
  };
  toggleOtherField("marital_status", "marital_status_other");
  toggleOtherField("religion", "religion_other");
  toggleOtherField("contact_relationship_select", "relationship_other_group");
  toggleOtherField("labor_insurance_status", "labor_insurance_status_other");
  // ✅ 特殊身份其他輸入框
  const otherSpecial = document.querySelector(
    'input[name="special_identity"][value="其他"]'
  );
  const otherSpecialInput = document.getElementById("special_identity_other");
  if (otherSpecial && otherSpecialInput) {
    const toggle = () => {
      otherSpecialInput.style.display = otherSpecial.checked
        ? "inline-block"
        : "none";
    };
    otherSpecial.addEventListener("change", toggle);
    toggle();
  }

  // ✅ 個案來源細項 AJAX
  const sourceSelect = document.getElementById("case_source_select");
  const detailSelect = document.getElementById("case_source_detail_select");
  const detailOther = document.getElementById("case_source_detail_other");

  const fillDetailOptions = (sourceValue) => {
    detailSelect.innerHTML = '<option value="">請選擇</option>';
    fetch("/get-source-details", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source_code: sourceValue }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.details)) {
          data.details.forEach((label) => {
            const option = document.createElement("option");
            option.value = label;
            option.textContent = label;
            detailSelect.appendChild(option);
          });
        }
        detailOther.style.display = "none";
      });
  };

  if (sourceSelect && detailSelect) {
    const preSelected = sourceSelect.getAttribute("data-value");
    if (preSelected) fillDetailOptions(preSelected);
    sourceSelect.addEventListener("change", () =>
      fillDetailOptions(sourceSelect.value)
    );
    detailSelect.addEventListener("change", () => {
      const selectedOption = detailSelect.options[detailSelect.selectedIndex];
      detailOther.style.display = selectedOption?.text.includes("其他")
        ? "block"
        : "none";
    });
  }

  // ✅ 抽菸選項切換控制
  const smokeRadios = document.querySelectorAll('input[name="smoke_type"]');
  const smokeMap = {
    daily: ["smoke_daily_count", "smoke_daily_years"],
    quit: ["smoke_quit_years"],
  };
  const allSmokeFields = Object.values(smokeMap).flat();
  const updateSmokeFields = () => {
    allSmokeFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    const selected = document.querySelector('input[name="smoke_type"]:checked');
    if (selected && smokeMap[selected.value]) {
      smokeMap[selected.value].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
      });
    }
  };
  smokeRadios.forEach((r) => r.addEventListener("change", updateSmokeFields));
  updateSmokeFields();

  // ✅ 檳榔選項切換控制
  const betelRadios = document.querySelectorAll('input[name="betel_type"]');
  const betelMap = {
    daily: ["betel_daily_count", "betel_daily_years"],
    sometimes: ["betel_sometimes_years"],
    quit: ["betel_quit_years"],
  };
  const allBetelFields = Object.values(betelMap).flat();
  const updateBetelFields = () => {
    allBetelFields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.disabled = true;
    });
    const selected = document.querySelector('input[name="betel_type"]:checked');
    if (selected && betelMap[selected.value]) {
      betelMap[selected.value].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
      });
    }
  };
  betelRadios.forEach((r) => r.addEventListener("change", updateBetelFields));
  updateBetelFields();
});

document.addEventListener("DOMContentLoaded", () => {
  const radios = document.querySelectorAll('input[name="case_source"]');
  const internalInput = document.getElementById("internal_dept");
  const externalGroup = document.getElementById("external_type_group");
  const otherInput = document.getElementById("case_source_other");

  const externalCompany = document.getElementById("external_company");
  const unionInput = document.getElementById("union_name");

  function updateCaseSourceFields() {
    const selected = document.querySelector(
      'input[name="case_source"]:checked'
    )?.value;

    internalInput.disabled = selected !== "院內轉介";
    externalGroup
      .querySelectorAll("input")
      .forEach((e) => (e.disabled = selected !== "院外轉介"));
    otherInput.disabled = selected !== "其他";
  }

  function updateExternalSubFields() {
    const externalType = document.querySelector(
      'input[name="external_type"]:checked'
    )?.value;

    externalCompany.disabled = externalType !== "公司";
    unionInput.disabled = externalType !== "工會";
  }

  radios.forEach((radio) =>
    radio.addEventListener("change", () => {
      updateCaseSourceFields();
      updateExternalSubFields();
    })
  );

  const externalTypeRadios = document.querySelectorAll(
    'input[name="external_type"]'
  );
  externalTypeRadios.forEach((r) =>
    r.addEventListener("change", updateExternalSubFields)
  );

  updateCaseSourceFields();
  updateExternalSubFields();
});

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("injury_type");
  const detailInput = document.getElementById("injury_type_detail");
  const triggerValues = [
    "其他交通事故（上下班交通事故）",
    "其他交通事故（公出交通事故）",
  ];

  // 載入下拉選項
  fetch("/api/options/injury_types")
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.options)) {
        data.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          select.appendChild(option);
        });
        toggleDetail(); // 初始化判斷
      }
    });

  function toggleDetail() {
    if (triggerValues.includes(select.value)) {
      detailInput.style.display = "inline-block";
    } else {
      detailInput.style.display = "none";
      detailInput.value = "";
    }
  }

  select.addEventListener("change", toggleDetail);
});

document.addEventListener("DOMContentLoaded", () => {
  const icdSelect = document.getElementById("icd10_code");

  fetch("/api/options/icd10")
    .then((res) => res.json())
    .then((data) => {
      if (data.success && Array.isArray(data.options)) {
        data.options.forEach((opt) => {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = opt;
          icdSelect.appendChild(option);
        });
      }
    })
    .catch((err) => {
      console.error("無法載入 ICD10 選項：", err);
    });
});

function autoResize(textarea) {
  textarea.style.height = "auto"; // 先重設高度
  textarea.style.height = textarea.scrollHeight + "px"; // 再設為內容高度
}

// 特殊身份其他選項切換
function toggleSpecialIdentityOther(checkbox) {
  const otherInput = document.getElementById("special_identity_other");
  if (otherInput) {
    otherInput.style.display = checkbox.checked ? "inline-block" : "none";
  }
}

// 保險類型其他選項切換
function toggleInsuranceOther(checkbox) {
  const input = document.getElementById("insurance_types_other");
  if (input) {
    input.style.display = checkbox.checked ? "inline-block" : "none";
  }
}

// 長期服藥選項切換
function toggleMedication(hasMediation) {
  const textarea = document.querySelector('textarea[name="chronic_medication"]');
  if (textarea) {
    textarea.disabled = !hasMediation;
    if (!hasMediation) {
      textarea.value = "";
    }
  }
}

// ✅ 頁面載入時：若「其他」已選中就顯示輸入框
document.addEventListener("DOMContentLoaded", () => {
  const otherCheckbox = document.querySelector(
    'input[name="insurance_types"][value="其他"]'
  );
  if (otherCheckbox?.checked) {
    toggleInsuranceOther(otherCheckbox);
  }
});

// ⬇ 職業分類碼下拉選單動態載入
fetch("/api/occupation-codes")
  .then((res) => res.json())
  .then((data) => {
    const select = document.getElementById("occupation_code");
    const selectedValue = select.getAttribute("data-value");
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.code;
        option.textContent = ` ${item.label}`;
        if (item.code === selectedValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }
  });

fetch("/api/industry-major-categories")
  .then((res) => res.json())
  .then((data) => {
    const select = document.getElementById("industry_major_category");
    const selectedValue = select.getAttribute("data-value");
    if (data.success && Array.isArray(data.data)) {
      data.data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.code;
        option.textContent = `${item.code} ${item.label}`;
        if (item.code === selectedValue) {
          option.selected = true;
        }
        select.appendChild(option);
      });
    }
  });

// 移除舊的 datalist 映射功能，改用下拉選單

function toggleOpeningReasonOther(checkbox) {
  const otherInput = document.getElementById("case_opening_reason_other");
  if (checkbox.value === "其他") {
    otherInput.style.display = checkbox.checked ? "block" : "none";
  }
}

// 預設載入時自動顯示「其他」欄位（若已勾選）
document.addEventListener("DOMContentLoaded", function () {
  const others = document.querySelectorAll(
    'input[name="case_opening_reason"][value="其他"]'
  );
  if (others.length && others[0].checked) {
    document.getElementById("case_opening_reason_other").style.display =
      "block";
  }
});

// 工作年資計算
document.addEventListener("DOMContentLoaded", () => {
  const yearsSelect = document.getElementById("work_exp_years");
  const monthsSelect = document.getElementById("work_exp_months");
  const hiddenInput = document.getElementById("workExperienceYears");

  if (yearsSelect && monthsSelect && hiddenInput) {
    function updateWorkExperience() {
      const years = parseInt(yearsSelect.value) || 0;
      const months = parseInt(monthsSelect.value) || 0;
      hiddenInput.value = years + (months / 12);
    }

    yearsSelect.addEventListener("change", updateWorkExperience);
    monthsSelect.addEventListener("change", updateWorkExperience);

    // 載入時設定預設值
    if (hiddenInput.value) {
      const totalYears = parseFloat(hiddenInput.value);
      const years = Math.floor(totalYears);
      const months = Math.round((totalYears - years) * 12);
      yearsSelect.value = years;
      monthsSelect.value = months;
    }
  }
});

// ✅ 返回功能
function goHome() {
  window.location.href = "/home";
}
function goBack() {
  window.location.href = "/step2";
}

// 行業別細類動態載入
let industryMinorData = [];
let industryMinorSelectInitialized = false;

// 載入行業細類資料
fetch("/api/industry-minor-all")
  .then((res) => res.json())
  .then((data) => {
    console.log("API回傳的完整資料:", data);
    if (data.success && Array.isArray(data.data)) {
      industryMinorData = data.data;
      console.log("行業細類資料載入成功:", industryMinorData.length, "筆");
      console.log("資料範例:", industryMinorData[0]); // 除錯用：查看資料結構
      console.log("前5筆資料:", industryMinorData.slice(0, 5)); // 檢查更多資料
      
      // 資料載入完成後，嘗試初始化行業別細類選單
      tryInitializeIndustryMinorSelect();
    } else {
      console.error("API回傳格式錯誤:", data);
    }
  })
  .catch((err) => {
    console.error("載入行業細類資料失敗:", err);
  });

function tryInitializeIndustryMinorSelect() {
  // 確保 DOM 已經載入且資料已準備好，並且還沒初始化過
  if (document.readyState === 'loading' || industryMinorData.length === 0 || industryMinorSelectInitialized) {
    return;
  }

  const industryMajorSelect = document.getElementById("industry_major_category");
  const industryMinorSelect = document.getElementById("industry_minor");

  if (!industryMajorSelect || !industryMinorSelect) {
    console.log("找不到行業別選單元素，稍後重試");
    return;
  }

  console.log("正在初始化行業別細類選單...");
  industryMinorSelectInitialized = true;

  // 直接綁定事件監聽器，不替換元素
  industryMajorSelect.addEventListener("change", function () {
    const selectedMajorCode = this.value;
    console.log("選擇的大類代碼:", selectedMajorCode);
    console.log("目前載入的行業細類資料總數:", industryMinorData.length);

    // 清空細類選項
    industryMinorSelect.innerHTML = '<option value="" disabled selected hidden>請選擇</option>';

    if (selectedMajorCode && industryMinorData.length > 0) {
      // 過濾出對應的細類選項 - 使用正確的欄位名稱
      const filteredMinor = industryMinorData.filter(
        (minor) => minor.major_code === selectedMajorCode
      );

      console.log("過濾條件:", `major_code === '${selectedMajorCode}'`);
      console.log("找到對應細類:", filteredMinor.length, "筆");
      
      if (filteredMinor.length > 0) {
        console.log("過濾後的細類資料範例:", filteredMinor[0]);
      } else {
        console.log("沒有找到對應的細類資料，檢查前幾筆原始資料:");
        console.log(industryMinorData.slice(0, 3));
      }

      // 新增細類選項
      filteredMinor.forEach((minor) => {
        const option = document.createElement("option");
        option.value = minor.minor_code;
        option.textContent = `${minor.minor_code} - ${minor.label}`;
        industryMinorSelect.appendChild(option);
      });
    }
  });

  // 如果有預設值，載入對應的細類選項
  const preSelectedMajor = industryMajorSelect.getAttribute("data-value");
  const preSelectedMinor = industryMinorSelect.getAttribute("data-value");
  
  if (preSelectedMajor) {
    industryMajorSelect.value = preSelectedMajor;
    industryMajorSelect.dispatchEvent(new Event('change'));
    
    if (preSelectedMinor) {
      setTimeout(() => {
        industryMinorSelect.value = preSelectedMinor;
      }, 200);
    }
  }

  console.log("行業別細類選單初始化完成");
}

// 在 DOM 載入完成後嘗試初始化
document.addEventListener("DOMContentLoaded", () => {
  // 延遲一點時間確保所有元素都已載入
  setTimeout(tryInitializeIndustryMinorSelect, 100);
});