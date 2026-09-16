(function () {
  "use strict";

  /*
   * GitHub-only browser configuration.
   *
   * Replace TOKEN with your own Baserow database token before publishing.
   * A browser-only integration necessarily exposes this token to visitors.
   */
  const CONFIG = Object.freeze({
    TOKEN: "LG6hnTBxgBG78FueElsSwpHRd4Wep1oL",
    TABLE_ID: "936442",
    API_URL: "https://api.baserow.io/api"
  });

  const form = document.getElementById("applicationForm");
  const statusForm = document.getElementById("statusForm");

  function injectStylesheet() {
    if (document.querySelector('link[data-lumin-baserow-css]')) return;
    const script = document.currentScript;
    const scriptBase = script
      ? new URL(".", script.src)
      : new URL("js/", window.location.href);
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = new URL("../css/baserow-app.css", scriptBase).href;
    stylesheet.dataset.luminBaserowCss = "true";
    document.head.appendChild(stylesheet);
  }

  injectStylesheet();

  function toast(message) {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    window.setTimeout(() => node.classList.remove("show"), 5000);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  }

  function setMessage(html, className) {
    const node = document.getElementById("appMsg") || document.getElementById("statusMsg");
    if (!node) return;
    node.className = className;
    node.innerHTML = html;
    node.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function processingMessage(label) {
    return `<div class="lumin-processing" role="status" aria-live="polite">
      <span class="lumin-processing-spinner" aria-hidden="true"></span>
      <div><strong>${escapeHtml(label)}</strong><small>Please keep this page open while we securely send and verify your information.</small></div>
    </div>`;
  }

  function removeCountryField() {
    if (!form) return;
    const unsupported = [
      /^Country of residence/i,
      /^How did you hear about us/i,
      /^Existing credit commitments/i,
      /^Account holder/i,
      /^Account type/i
    ];
    form.querySelectorAll("label.field").forEach((label) => {
      if (unsupported.some((pattern) => pattern.test(label.textContent.trim()))) {
        label.remove();
      }
    });
  }

  function updateVisibleLabels() {
    if (statusForm) {
      const labels = statusForm.querySelectorAll("label");
      const inputs = statusForm.querySelectorAll("input");
      if (labels[0]) labels[0].childNodes[0].textContent = "ID number *";
      if (labels[1]) labels[1].childNodes[0].textContent = "Email or phone number *";
      if (inputs[0]) inputs[0].placeholder = "Enter your ID or passport number";
      if (inputs[1]) inputs[1].placeholder = "Email address or mobile number";
    }
    if (form) {
      const labels = [...form.querySelectorAll('input[type="file"]')]
        .map((input) => input.closest("label"));
      if (labels[0]) labels[0].childNodes[0].textContent = "ID document / Passport *";
      if (labels[1]) labels[1].childNodes[0].textContent = "Latest bank statement — month 1 *";
      if (labels[2]) labels[2].childNodes[0].textContent = "Bank statement — month 2 *";
      if (labels[3]) labels[3].childNodes[0].textContent = "Bank statement — month 3 *";
    }
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function digits(value) {
    return text(value).replace(/\D/g, "");
  }

  function phone(value) {
    const raw = digits(value);
    if (!raw) return "";
    if (raw.startsWith("27")) return raw;
    if (raw.startsWith("0")) return `27${raw.slice(1)}`;
    if (raw.length === 9) return `27${raw}`;
    return raw;
  }

  function numberValue(value) {
    const cleaned = text(value).replace(/[^\d.-]/g, "");
    const number = Number(cleaned);
    return cleaned && Number.isFinite(number) ? number : 0;
  }

  function fieldList() {
    return [...form.querySelectorAll(".panel input, .panel select")];
  }

  function values() {
    const fields = fieldList();
    return {
      loanAmount: fields[3] || fields[0],
      loanType: fields[1],
      loanPurpose: fields[5] || fields[2],
      loanTerm: fields[4],
      name: fields[6],
      lastname: fields[7],
      idNo: fields[8],
      email: fields[9],
      phone: fields[10],
      address: fields[11],
      employ: fields[12],
      income: fields[13],
      monthlyExpense: fields[14],
      idDoc: fields[15],
      bankStatement1: fields[16],
      bankStatement2: fields[17],
      bankStatement3: fields[18],
      bankName: fields[19],
      accountNumber: fields[20]
    };
  }

  function checkPanel(panel) {
    for (const control of panel.querySelectorAll("input, select, textarea")) {
      if (!control.checkValidity()) {
        control.reportValidity();
        return false;
      }
    }
    return true;
  }

  function configurationReady() {
    return CONFIG.TOKEN && !CONFIG.TOKEN.startsWith("REPLACE_WITH_");
  }

  function technicalError(error, context) {
    console.error(`Application ${context} error`, error);
  }

  async function jsonResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.detail || data.error || `Request failed (${response.status})`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  async function uploadFile(file) {
    if (!file) return null;
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(`${CONFIG.API_URL}/user-files/upload-file/`, {
      method: "POST",
      headers: { Authorization: `Token ${CONFIG.TOKEN}` },
      body
    });
    return jsonResponse(response);
  }

  async function createRow(payload) {
    const response = await fetch(
      `${CONFIG.API_URL}/database/rows/table/${CONFIG.TABLE_ID}/?user_field_names=false`,
      {
        method: "POST",
        headers: {
          Authorization: `Token ${CONFIG.TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    return jsonResponse(response);
  }

  const F = Object.freeze({
    name: "field_8136507",
    lastname: "field_8136508",
    loanAmount: "field_8136509",
    email: "field_8136510",
    phone: "field_8136511",
    idDoc: "field_8136512",
    bankStatement1: "field_8136513",
    bankStatement2: "field_9166173",
    bankStatement3: "field_9166193",
    employ: "field_8136514",
    income: "field_8136515",
    loanType: "field_8136516",
    loanPurpose: "field_8136517",
    loanTerm: "field_8136518",
    idNo: "field_8136519",
    monthlyIncome: "field_8136520",
    monthlyExpense: "field_8136522",
    address: "field_8203100",
    accountNumber: "field_8800515",
    bankName: "field_8800797"
  });

  function rowValue(row, field) {
    return row && row[field] != null ? row[field] : "";
  }

  function contactMatches(row, contact) {
    const supplied = text(contact);
    if (supplied.includes("@")) {
      return text(rowValue(row, F.email)).toLowerCase() === supplied.toLowerCase();
    }
    return phone(rowValue(row, F.phone)) === phone(supplied);
  }

  function fileNames(row) {
    return [F.idDoc, F.bankStatement1, F.bankStatement2, F.bankStatement3]
      .flatMap((field) => Array.isArray(rowValue(row, field)) ? rowValue(row, field) : [])
      .map((file) => text(file && file.name))
      .filter(Boolean);
  }

  function publicApplication(row) {
    return {
      idNo: text(rowValue(row, F.idNo)),
      name: [text(rowValue(row, F.name)), text(rowValue(row, F.lastname))].filter(Boolean).join(" "),
      email: text(rowValue(row, F.email)),
      phone: text(rowValue(row, F.phone)),
      loanAmount: text(rowValue(row, F.loanAmount)),
      loanType: text(rowValue(row, F.loanType)),
      loanPurpose: text(rowValue(row, F.loanPurpose)),
      loanTerm: text(rowValue(row, F.loanTerm)),
      employment: text(rowValue(row, F.employ)),
      income: text(rowValue(row, F.income)),
      monthlyExpense: text(rowValue(row, F.monthlyExpense)),
      address: text(rowValue(row, F.address)),
      bankName: text(rowValue(row, F.bankName)),
      accountNumber: text(rowValue(row, F.accountNumber)),
      uploadedDocuments: fileNames(row),
      status: "Under processing",
      nextStep: "Your application is under processing. Email info@luminzafinance.com to proceed."
    };
  }

  async function findApplication(idNo, contact) {
    const query = new URLSearchParams({
      user_field_names: "false",
      size: "50",
      filter__field_8136519__equal: text(idNo)
    });
    const response = await fetch(
      `${CONFIG.API_URL}/database/rows/table/${CONFIG.TABLE_ID}/?${query}`,
      { headers: { Authorization: `Token ${CONFIG.TOKEN}` } }
    );
    const data = await jsonResponse(response);
    return (Array.isArray(data.results) ? data.results : [])
      .find((row) => contactMatches(row, contact)) || null;
  }

  if (form) {
    removeCountryField();
    const panels = [...form.querySelectorAll(".panel[data-panel]")];
    const next = document.getElementById("next");
    const previous = document.getElementById("prev");
    const submit = document.getElementById("submitApp");
    let step = 1;
    const total = panels.length;

    function showStep() {
      panels.forEach((panel) => {
        panel.classList.toggle("hidden", Number(panel.dataset.panel) !== step);
      });
      document.querySelectorAll(".step").forEach((node) => {
        const number = Number(node.dataset.step);
        node.classList.toggle("active", number === step);
        node.classList.toggle("done", number < step);
      });
      if (previous) previous.disabled = step === 1;
      if (next) next.classList.toggle("hidden", step === total);
      if (submit) submit.classList.toggle("hidden", step !== total);
    }

    if (next) {
      next.onclick = () => {
        const currentPanel = panels.find((panel) => Number(panel.dataset.panel) === step);
        if (!currentPanel || !checkPanel(currentPanel)) return;
        if (step < total) {
          step += 1;
          showStep();
        }
      };
    }
    if (previous) {
      previous.onclick = () => {
        if (step > 1) {
          step -= 1;
          showStep();
        }
      };
    }

    form.onsubmit = async (event) => {
      event.preventDefault();
      if (!panels.every(checkPanel)) return;
      if (!configurationReady()) {
        setMessage('<div class="lumin-result is-error"><strong>Submission is not configured.</strong><div>Please complete the website configuration before submitting.</div></div>', "form-message");
        return;
      }

      const data = values();
      const files = {
        idDoc: data.idDoc.files[0],
        bankStatement1: data.bankStatement1.files[0],
        bankStatement2: data.bankStatement2.files[0],
        bankStatement3: data.bankStatement3.files[0]
      };
      const fields = {
        [F.name]: text(data.name.value),
        [F.lastname]: text(data.lastname.value),
        [F.loanAmount]: text(data.loanAmount.value),
        [F.email]: text(data.email.value).toLowerCase(),
        [F.phone]: phone(data.phone.value),
        [F.employ]: text(data.employ.value),
        [F.income]: text(data.income.value),
        [F.loanType]: text(data.loanType.value),
        [F.loanPurpose]: text(data.loanPurpose.value),
        [F.loanTerm]: text(data.loanTerm.value),
        [F.idNo]: text(data.idNo.value),
        [F.monthlyIncome]: numberValue(data.income.value),
        [F.monthlyExpense]: text(data.monthlyExpense.value),
        [F.address]: text(data.address.value),
        [F.accountNumber]: text(data.accountNumber.value),
        [F.bankName]: text(data.bankName.value)
      };

      if (submit) submit.disabled = true;
      setMessage(processingMessage("Securely processing your application…"), "form-message");
      toast("Your application is being securely submitted.");

      try {
        const [idDoc, bank1, bank2, bank3] = await Promise.all([
          uploadFile(files.idDoc),
          uploadFile(files.bankStatement1),
          uploadFile(files.bankStatement2),
          uploadFile(files.bankStatement3)
        ]);
        fields[F.idDoc] = [{ name: idDoc.name }];
        fields[F.bankStatement1] = [{ name: bank1.name }];
        fields[F.bankStatement2] = [{ name: bank2.name }];
        fields[F.bankStatement3] = [{ name: bank3.name }];
        await createRow(fields);
        setMessage(`<div class="lumin-result" role="status" aria-live="polite">
          <strong>Application successfully submitted.</strong>
          <div>Your application is now <b>under processing</b>.</div>
          <small>Use your ID number together with the same email address or phone number to check the application. Email <a href="mailto:info@luminzafinance.com">info@luminzafinance.com</a> if you need to proceed.</small>
        </div>`, "form-message success");
        form.querySelectorAll("input, select, button").forEach((node) => {
          if (node !== submit) node.disabled = true;
        });
        toast("Application submitted successfully.");
      } catch (error) {
        technicalError(error, "submission");
        setMessage('<div class="lumin-result is-error" role="alert"><strong>We could not complete your submission.</strong><div>Please check your connection and try again.</div></div>', "form-message");
        if (submit) submit.disabled = false;
        toast("Submission needs your attention.");
      }
    };
    showStep();
  }

  if (statusForm) {
    statusForm.onsubmit = async (event) => {
      event.preventDefault();
      const inputs = statusForm.querySelectorAll("input");
      const idNo = inputs[0] ? text(inputs[0].value) : "";
      const contact = inputs[1] ? text(inputs[1].value) : "";
      if (!idNo || !contact) {
        statusForm.reportValidity();
        return;
      }
      if (!configurationReady()) {
        setMessage('<div class="lumin-result is-error"><strong>Lookup is not configured.</strong><div>Please complete the website configuration before checking an application.</div></div>', "form-message");
        return;
      }
      const button = statusForm.querySelector("button");
      if (button) button.disabled = true;
      setMessage(processingMessage("Checking your application securely…"), "form-message");
      try {
        const row = await findApplication(idNo, contact);
        if (!row) {
          setMessage('<div class="lumin-result is-error" role="alert"><strong>No application found.</strong><div>Check your ID number and email or phone number, or submit an application first.</div><a class="lumin-apply-link" href="apply.html">Apply now →</a></div>', "form-message");
          toast("No matching application found.");
          return;
        }
        const application = publicApplication(row);
        setMessage(`<div class="lumin-result" role="status" aria-live="polite">
          <strong>Application found.</strong>
          <div class="lumin-result-grid">
            <div><span>ID number</span><b>${escapeHtml(application.idNo)}</b></div>
            <div><span>Status</span><b>${escapeHtml(application.status)}</b></div>
            <div><span>Applicant</span><b>${escapeHtml(application.name)}</b></div>
            <div><span>Loan type</span><b>${escapeHtml(application.loanType)}</b></div>
            <div><span>Amount requested</span><b>${escapeHtml(application.loanAmount || "Not provided")}</b></div>
            <div><span>Loan term</span><b>${escapeHtml(application.loanTerm || "Not provided")}</b></div>
            <div><span>Loan purpose</span><b>${escapeHtml(application.loanPurpose || "Not provided")}</b></div>
            <div><span>Email</span><b>${escapeHtml(application.email || "Not provided")}</b></div>
            <div><span>Phone</span><b>${escapeHtml(application.phone || "Not provided")}</b></div>
            <div><span>Employment</span><b>${escapeHtml(application.employment || "Not provided")}</b></div>
            <div><span>Monthly income</span><b>${escapeHtml(application.income || "Not provided")}</b></div>
            <div><span>Monthly expenses</span><b>${escapeHtml(application.monthlyExpense || "Not provided")}</b></div>
            <div><span>Bank</span><b>${escapeHtml(application.bankName || "Not provided")}</b></div>
            <div><span>Account number</span><b>${escapeHtml(application.accountNumber || "Not provided")}</b></div>
            <div><span>Address</span><b>${escapeHtml(application.address || "Not provided")}</b></div>
          </div>
          <div><b>Uploaded documents</b><small>${escapeHtml(application.uploadedDocuments.join(", ") || "No document names returned")}</small></div>
          <small>${escapeHtml(application.nextStep)}</small>
        </div>`, "form-message success");
        toast("Application details found.");
      } catch (error) {
        technicalError(error, "lookup");
        setMessage('<div class="lumin-result is-error" role="alert"><strong>We could not check your application.</strong><div>Please check your connection and try again.</div></div>', "form-message");
        toast("Application check needs your attention.");
      } finally {
        if (button) button.disabled = false;
      }
    };
  }

  updateVisibleLabels();
}());
