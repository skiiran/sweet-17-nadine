document.addEventListener("DOMContentLoaded", function () {
  // ===== KODE ASLI UNTUK CAKE =====
  const cake = document.getElementById("cake");

  let candleCount = 0;
  let maxCandles = 17;
  let activeCandles = 0;

  // ===== FITUR MIKROFON - SENSITIVITAS OPTIMAL =====
  const micButton = document.getElementById("micButton");
  const permissionIndicator = document.getElementById("permissionIndicator");
  let audioContext = null;
  let analyser = null;
  let microphone = null;
  let isListening = false;
  let lastBlowTime = 0;
  let mediaStream = null;

  // Function to create a candle - POSISI BEBAS
  function createCandle() {
    if (candleCount >= maxCandles) return;

    candleCount++;
    activeCandles++;

    const candle = document.createElement("div");
    candle.className = "candle";

    const flame = document.createElement("div");
    flame.className = "flame";
    candle.appendChild(flame);

    // POSISI BEBAS - RANDOM di atas cake
    const cakeWidth = 250;
    const cakeHeight = 200;

    // Batasan area di atas cake
    const minLeft = 30;
    const maxLeft = cakeWidth - 45;
    const minTop = -10;
    const maxTop = 30;

    // Random position
    const left = minLeft + Math.random() * (maxLeft - minLeft);
    const top = minTop + Math.random() * (maxTop - minTop);

    candle.style.left = left + "px";
    candle.style.top = top + "px";

    // Click event as fallback
    candle.addEventListener("click", function (e) {
      e.stopPropagation();
      blowCandle(this);
    });

    cake.appendChild(candle);
  }

  // Function to blow a candle
  function blowCandle(candle) {
    if (!candle.classList.contains("out")) {
      candle.classList.add("out");
      activeCandles--;

      // Trigger confetti kecil
      confetti({
        particleCount: 10,
        spread: 30,
        origin: {
          x: (parseInt(candle.style.left) + 7) / 400,
          y: 0.3,
        },
        colors: ["#ffb6c1", "#ffd9e2", "#87ceeb", "#add8e6"],
      });

      console.log("Lilin mati! Sisa:", activeCandles); // Debug

      // Jika semua lilin sudah mati, confetti besar
      if (activeCandles === 0) {
        // Confetti besar
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: [
            "#ffb6c1",
            "#ffd9e2",
            "#87ceeb",
            "#add8e6",
            "#ffd700",
            "#98fb98",
          ],
        });

        // Tambahan confetti kedua setelah 0.3 detik
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.4, x: 0.3 },
            colors: ["#ffb6c1", "#87ceeb", "#ffd700"],
          });
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.4, x: 0.7 },
            colors: ["#ffd9e2", "#add8e6", "#98fb98"],
          });
        }, 200);
      }
    }
  }

  // Add click event to cake to create candles
  if (cake) {
    cake.addEventListener("click", function (e) {
      // Don't create candle if clicking on existing candle
      if (
        e.target.classList.contains("candle") ||
        e.target.parentElement?.classList.contains("candle")
      ) {
        return;
      }
      createCandle();
    });
  }

  // ===== FITUR MIKROFON - SENSITIVITAS OPTIMAL =====
  async function initMicrophone() {
    try {
      console.log("Mengakses mikrofon...");

      // Reset audio context jika sudah ada
      if (audioContext) {
        await audioContext.close();
      }

      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("Mikrofon berhasil diakses");

      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(mediaStream);

      microphone.connect(analyser);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      isListening = true;
      micButton.classList.add("listening");
      micButton.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      permissionIndicator.classList.add("active");

      // Variable untuk deteksi
      let blowStreak = 0;
      let baselineVolume = 0;
      let baselineSamples = 0;

      // Kumpulkan baseline volume selama 1 detik pertama
      function collectBaseline() {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        let avg = sum / bufferLength;

        baselineVolume += avg;
        baselineSamples++;

        if (baselineSamples < 20) {
          // Kumpulkan 20 sampel
          setTimeout(collectBaseline, 50);
        } else {
          baselineVolume = baselineVolume / baselineSamples;
          console.log("Baseline volume:", Math.round(baselineVolume));
          // Mulai deteksi setelah baseline didapat
          detectBlow();
        }
      }

      function detectBlow() {
        if (!isListening) return;

        analyser.getByteFrequencyData(dataArray);

        // Hitung volume maksimum
        let maxVolume = 0;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > maxVolume) maxVolume = dataArray[i];
        }

        // Hitung rata-rata volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        let averageVolume = sum / bufferLength;

        // Hitung selisih dari baseline
        let volumeDiff = averageVolume - baselineVolume;

        const now = Date.now();

        // LOG UNTUK DEBUG (buka console F12 untuk melihat)
        if (now % 500 < 50) {
          // Log setiap 500ms
          console.log(
            "Volume - Avg:",
            Math.round(averageVolume),
            "Diff:",
            Math.round(volumeDiff),
            "Max:",
            maxVolume,
          );
        }

        // DETEKSI TIUPAN - Threshold berdasarkan baseline
        const threshold = 15; // Threshold di atas baseline
        const isBlowing =
          volumeDiff > threshold || maxVolume > baselineVolume + 30;

        // Hitung streak
        if (isBlowing) {
          blowStreak++;
        } else {
          blowStreak = 0;
        }

        // Kondisi tiupan: volume melebihi threshold ATAU streak > 3
        if (
          (volumeDiff > threshold ||
            maxVolume > baselineVolume + 30 ||
            blowStreak > 3) &&
          now - lastBlowTime > 300 &&
          activeCandles > 0
        ) {
          // Cooldown 300ms dan pastikan ada lilin

          lastBlowTime = now;

          console.log("🔥 TIUPAN TERDETEKSI!", {
            diff: Math.round(volumeDiff),
            maxVolume,
            blowStreak,
          });

          // Visual feedback pada tombol
          micButton.classList.add("blow-detected");
          setTimeout(() => {
            micButton.classList.remove("blow-detected");
          }, 200);

          // Matikan lilin (hanya jika ada lilin yang menyala)
          const litCandles = document.querySelectorAll(".candle:not(.out)");
          if (litCandles.length > 0) {
            // Tiup 1 lilin setiap kali tiupan
            const randomIndex = Math.floor(Math.random() * litCandles.length);
            const randomCandle = litCandles[randomIndex];
            blowCandle(randomCandle);
          }
        }

        requestAnimationFrame(detectBlow);
      }

      // Mulai dengan mengumpulkan baseline
      collectBaseline();
    } catch (err) {
      console.error("Microphone error:", err);
      alert(
        "Tidak dapat mengakses mikrofon. Pastikan Anda mengizinkan akses mikrofon.",
      );
      micButton.classList.remove("listening");
    }
  }

  function stopMicrophone() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
    }
    if (audioContext) {
      audioContext.close();
    }
    isListening = false;
    micButton.classList.remove("listening");
    micButton.classList.remove("blow-detected");
    micButton.innerHTML = '<i class="fas fa-microphone"></i>';
    permissionIndicator.classList.remove("active");
    console.log("Mikrofon dimatikan");
  }

  micButton.addEventListener("click", function () {
    if (isListening) {
      stopMicrophone();
    } else {
      initMicrophone();
    }
  });

  // ===== STAGGERED MENU =====
  const menuWrapper = document.getElementById("staggeredMenu");
  const menuToggle = document.getElementById("menuToggle");
  const menuOverlay = document.getElementById("menuOverlay");
  const menuText = document.getElementById("menuText");

  let isMenuOpen = false;

  function openMenu() {
    isMenuOpen = true;
    menuWrapper.classList.add("menu-open");
    menuToggle.classList.add("open");

    setTimeout(() => {
      menuText.textContent = "CLOSE";
      menuText.classList.add("show");
    }, 50);

    document.body.style.overflow = "hidden";
  }

  function closeMenu() {
    isMenuOpen = false;
    menuWrapper.classList.remove("menu-open");
    menuToggle.classList.remove("open");

    menuText.classList.remove("show");
    setTimeout(() => {
      if (!isMenuOpen) {
        menuText.textContent = "MENU";
      }
    }, 300);

    document.body.style.overflow = "";
  }

  menuToggle.addEventListener("click", function (e) {
    e.stopPropagation();
    isMenuOpen ? closeMenu() : openMenu();
  });

  menuOverlay.addEventListener("click", closeMenu);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && isMenuOpen) closeMenu();
  });

  document.getElementById("menuPanel").addEventListener("click", function (e) {
    e.stopPropagation();
  });

  // TIDAK ADA LILIN DI AWAL - kode untuk membuat lilin dihapus
  // Lilin hanya muncul saat cake di-klik

  console.log("Cake siap - Klik cake untuk menambahkan lilin");
});
