import * as Astronomy from "astronomy-engine";
import { getSkyForDate, getAspects, summarizeSkyForPrompt, tropicalLongitude, lahiriAyanamsa } from "../src/lib/ephemeris";

let fail = 0;
function check(name: string, ok: boolean, info: string) {
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  [${info}]`);
}
const d = (s: string) => new Date(s);

const eq = tropicalLongitude("Sun", d("2025-03-20T09:01:00Z"));
check("Sun at 2025 March equinox ~0deg", Math.min(eq, 360 - eq) < 0.05, `lon=${eq.toFixed(4)}`);

const solstice = tropicalLongitude("Sun", d("2025-06-21T02:42:00Z"));
check("Sun enters Cancer 2025-06-21 02:42Z (~90deg)", Math.abs(solstice - 90) < 0.05, `lon=${solstice.toFixed(4)}`);

const fm = getSkyForDate(d("2025-01-13T22:27:00Z")).moonPhase;
check(
  "Full moon 2025-01-13",
  Math.abs(fm.angle - 180) < 1 && fm.illumination > 0.99 && fm.nameTh === "วันเพ็ญ",
  `angle=${fm.angle.toFixed(2)} illum=${fm.illumination.toFixed(4)} ${fm.nameTh}`,
);

const s20 = getSkyForDate(d("2025-04-20T05:00:00Z")).bodies.Sun.siderealSign;
const s10 = getSkyForDate(d("2025-04-10T05:00:00Z")).bodies.Sun.siderealSign;
check("Sidereal Sun 2025-04-20 = เมษ", s20 === "เมษ", s20);
check("Sidereal Sun 2025-04-10 = มีน", s10 === "มีน", s10);

const r1 = getSkyForDate(d("2025-04-01T05:00:00Z")).bodies.Mercury.retrograde;
const r2 = getSkyForDate(d("2025-06-01T05:00:00Z")).bodies.Mercury.retrograde;
check("Mercury retrograde 2025-04-01", r1 === true, String(r1));
check("Mercury not retrograde 2025-06-01", r2 === false, String(r2));

const a2000 = lahiriAyanamsa(d("2000-01-01T00:00:00Z"));
const a2025 = lahiriAyanamsa(d("2025-01-01T00:00:00Z"));
check("Ayanamsa 2000 ~23.853", Math.abs(a2000 - 23.853) < 0.01, a2000.toFixed(4));
check("Ayanamsa 2025 ~24.2 (24d12m)", Math.abs(a2025 - 24.2) < 0.02, a2025.toFixed(4));

const sky = getSkyForDate(d("2025-04-20T05:00:00Z"));
check("Aspects within orb", getAspects(sky).every((a) => a.orb <= 8), `n=${getAspects(sky).length}`);
for (const kind of ["daily", "weekly", "monthly"] as const) {
  const s = summarizeSkyForPrompt(d("2025-04-20T05:00:00Z"), kind);
  check(`summary ${kind} <=900 chars`, s.length > 0 && s.length <= 900, `len=${s.length}`);
  console.log(s + "\n");
}

// Optional JPL Horizons cross-check: run with --jpl (needs network)
async function jpl() {
  const q = new URLSearchParams({
    format: "json",
    COMMAND: "'301'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    START_TIME: "'2025-04-20 05:00'",
    STOP_TIME: "'2025-04-20 06:00'",
    STEP_SIZE: "'1d'",
    QUANTITIES: "'31'",
    ANG_FORMAT: "'DEG'",
    CSV_FORMAT: "'YES'",
  });
  try {
    const res = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`);
    const j = (await res.json()) as { result: string };
    const line = j.result.split("$$SOE")[1].split("\n")[1];
    console.log("JPL row:", line);
    const nums = line.split(",").map((x) => x.trim()).filter(Boolean).map(parseFloat).filter((x) => !Number.isNaN(x));
    const jplLon = nums[nums.length - 2];
    const mine = Astronomy.EclipticGeoMoon(d("2025-04-20T05:00:00Z")).lon;
    check("Moon lon vs JPL Horizons (<0.1deg)", Math.abs(jplLon - mine) < 0.1, `jpl=${jplLon} mine=${mine.toFixed(4)}`);
  } catch (e) {
    console.log("JPL cross-check skipped:", String(e));
  }
}
(process.argv.includes("--jpl") ? jpl() : Promise.resolve()).then(() => process.exit(fail ? 1 : 0));
