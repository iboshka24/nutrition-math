const test = require("node:test");
const assert = require("node:assert/strict");
const { basalMetabolicRate, maintenanceCalories, macroSplit, goal, ACTIVITY } = require("../src/index.js");

test("формула Миффлина даёт известные значения", () => {
  // 10·86 + 6.25·178 − 5·24 + 5 = 1857.5 → 1858
  assert.equal(basalMetabolicRate({ sex: "male", weightKg: 86, heightCm: 178, age: 24 }), 1858);
  // у женщин −161 вместо +5
  // 10·62 + 6.25·165 − 5·30 − 161 = 1340.25 → 1340
  assert.equal(basalMetabolicRate({ sex: "female", weightKg: 62, heightCm: 165, age: 30 }), 1340);
});

test("суточный расход умножается на коэффициент активности", () => {
  assert.equal(maintenanceCalories(1858, "sedentary"), Math.round(1858 * 1.2));
  assert.equal(maintenanceCalories(1858, "moderate"), Math.round(1858 * 1.55));
});

test("белок считается от массы тела, а не от калорий", () => {
  const lose = macroSplit({ calories: 1980, weightKg: 86, goal: "lose" });
  assert.equal(lose.proteinG, 138); // 86 · 1.6
  const gain = macroSplit({ calories: 2800, weightKg: 86, goal: "gain" });
  assert.equal(gain.proteinG, 155); // 86 · 1.8
});

test("макросы складываются в заявленные калории", () => {
  const { proteinG, fatG, carbsG } = macroSplit({ calories: 1980, weightKg: 86, goal: "lose" });
  const total = proteinG * 4 + fatG * 9 + carbsG * 4;
  assert.ok(Math.abs(total - 1980) <= 8, `сумма ${total} должна быть рядом с 1980`);
});

test("полный расчёт цели сходится и возвращает предупреждения списком", () => {
  const result = goal({ sex: "male", weightKg: 86, heightCm: 178, age: 24, activity: "light", targetWeightKg: 74, weeks: 9 });
  assert.equal(result.bmr, 1858);
  assert.equal(result.maintenance, Math.round(1858 * 1.375));
  assert.equal(result.direction, "lose");
  // 12 кг за 9 недель — это 1,333 кг/нед при безопасных 0,86 (1% от 86 кг),
  // поэтому библиотека обязана срезать темп и сказать об этом.
  assert.equal(result.weeklyRateKg, 0.86);
  assert.ok(result.warnings.some((w) => /быстрее безопасного/.test(w)), "должно быть предупреждение о темпе");
  assert.ok(Array.isArray(result.warnings));
  assert.ok(result.targetCalories > 1500);
});

test("слишком быстрый темп ловится и тормозится до 1% массы в неделю", () => {
  const result = goal({ sex: "male", weightKg: 100, heightCm: 180, age: 30, activity: "sedentary", targetWeightKg: 80, weeks: 5 });
  // 20 кг за 5 недель — это 4 кг в неделю при безопасных 1 кг
  assert.equal(result.weeklyRateKg, 1);
  // предупреждений два: темп срезан и норма опустилась к полу
  assert.ok(result.warnings.length >= 1);
  assert.ok(result.warnings.some((w) => /быстрее безопасного/.test(w)));
});

test("норма не опускается ниже пола, и об этом сказано прямо", () => {
  const result = goal({ sex: "female", weightKg: 50, heightCm: 150, age: 60, activity: "sedentary", targetWeightKg: 42, weeks: 3 });
  assert.equal(result.targetCalories, 1200);
  assert.ok(result.warnings.some((w) => /потеря мышц/.test(w)));
});

test("без срока цель сохраняет вес и не выдумывает дефицит", () => {
  const result = goal({ sex: "male", weightKg: 80, heightCm: 180, age: 25, activity: "sedentary", targetWeightKg: 80 });
  assert.equal(result.direction, "keep");
  assert.equal(result.dailyDelta, 0);
  assert.equal(result.targetCalories, result.maintenance);
});

test("мусор на входе — исключение, а не тихая ерунда в ответе", () => {
  assert.throws(() => basalMetabolicRate({ sex: "male", weightKg: "86", heightCm: 178, age: 24 }), TypeError);
  assert.throws(() => basalMetabolicRate({ sex: "x", weightKg: 86, heightCm: 178, age: 24 }), TypeError);
  assert.throws(() => basalMetabolicRate({ sex: "male", weightKg: -5, heightCm: 178, age: 24 }), RangeError);
  assert.throws(() => maintenanceCalories(1800, "nope"), TypeError);
});
