async function scanMedication(patientId) {
    const fileInput = document.getElementById("scan-image");
    const resultDiv = document.getElementById("scan-result");

    if (!fileInput.files || fileInput.files.length === 0) {
      resultDiv.innerText = "Please choose an image first.";
      return;
    }

    const formData = new FormData();
    formData.append("image", fileInput.files[0]);

    resultDiv.innerText = "Scanning with AI...";

    try {
      const resp = await fetch(`/patient/${patientId}/scan_med`, {
        method: "POST",
        body: formData
      });
      const data = await resp.json();

      if (data.error) {
        resultDiv.innerText = "Error: " + data.error;
        return;
      }

      // ----------------------------
      // 1) 자동 입력 (여기 추가)
      // ----------------------------
      const nameInput = document.querySelector('input[name="name"]');
      const doseInput = document.querySelector('input[name="dose"]');
      const freqInput = document.querySelector('input[name="frequency"]');

      if (data.suggested) {
        if (data.suggested.name && nameInput) {
          nameInput.value = data.suggested.name;
        }
        if (data.suggested.dose && doseInput) {
          doseInput.value = data.suggested.dose;
        }
        if (data.suggested.frequency && freqInput) {
          freqInput.value = data.suggested.frequency;
        }
      }
      // ----------------------------

      if (!data.lines || data.lines.length === 0) {
        resultDiv.innerText = "No text detected.";
        return;
      }

      // ----------------------------
      // 2) 기존: 전체 텍스트도 아래에 출력 (선택 재입력용)
      // ----------------------------
      resultDiv.innerHTML = `
        <div>Detected text (click to override medication name):</div>
        <ul>
          ${data.lines.map(line =>
            `<li><button type="button" class="btn btn-sm btn-link p-0" onclick="fillMedName('${line.replace(/'/g, "\\'")}')">${line}</button></li>`
          ).join("")}
        </ul>
      `;

    } catch (err) {
      console.error(err);
      resultDiv.innerText = "Error during scan.";
    }
}

function fillMedName(text) {
    const nameInput = document.querySelector('input[name="name"]');
    if (nameInput) {
      nameInput.value = text;
    }
}
