/**
 * nutrition-math — калории и макросы из твоих собственных данных.
 *
 * Никакой магии: формула Миффлина — Сан Жеора для базального обмена, коэффициент
 * активности для суточного расхода, дальше безопасный дефицит. Границы не
 * вкусовые, а медицинские: ниже 1500 ккал для мужчин и 1200 для женщин
 * начинается потеря мышц, а не похудение, и быстрее 1% массы тела в неделю
 * организм отвечает тем, что замедляет обмен.
 *
 * Zero dependencies. MIT.
 */

const ACTIVITY = {
  sedentary: 1.2,      // сидячая работа, без тренировок
  light: 1.375,        // 1–3 тренировки в неделю
  moderate: 1.55,      // 3–5 тренировок
  active: 1.725,       // 6–7 тренировок
  athlete: 1.9,        // две тренировки в день
};

const KCAL_PER_KG_FAT = 7700;

function assertNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
}

function basalMetabolicRate({ sex, weightKg, heightCm, age }) {
  assertNumber(weightKg, "weightKg");
  assertNumber(heightCm, "heightCm");
  assertNumber(age, "age");
  if (sex !== "male" && sex !== "female") {
    throw new TypeError('sex must be "male" or "female"');
  }
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) {
    throw new RangeError("weight, height and age must be positive");
  }
  // Mifflin — St Jeor: точнее правила Харриса — Бенедикта на людях с лишним весом.
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === "male" ? base + 5 : base - 161);
}

function maintenanceCalories(bmr, activity = "sedentary") {
  assertNumber(bmr, "bmr");
  const factor = ACTIVITY[activity];
  if (!factor) {
    throw new TypeError(`unknown activity "${activity}", expected one of ${Object.keys(ACTIVITY).join(", ")}`);
  }
  return Math.round(bmr * factor);
}

function macroSplit({ calories, weightKg, goal = "lose" }) {
  assertNumber(calories, "calories");
  assertNumber(weightKg, "weightKg");
  // Белок считаем от массы тела, а не от калорий: на дефиците он держит мышцы.
  const proteinPerKg = goal === "gain" ? 1.8 : goal === "lose" ? 1.6 : 1.4;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.28) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { proteinG, fatG, carbsG };
}

/**
 * Полный расчёт цели. Возвращает и цифры, и предупреждения: приложение обязано
 * сказать, что цель слишком агрессивная, а не молча её выполнить.
 */
function goal({ sex, weightKg, heightCm, age, activity = "sedentary", targetWeightKg, weeks }) {
  const bmr = basalMetabolicRate({ sex, weightKg, heightCm, age });
  const maintenance = maintenanceCalories(bmr, activity);
  const warnings = [];

  const direction = targetWeightKg < weightKg ? "lose" : targetWeightKg > weightKg ? "gain" : "keep";
  const deltaKg = Math.abs(targetWeightKg - weightKg);

  let weeklyRateKg = 0;
  if (weeks && weeks > 0 && deltaKg > 0) {
    weeklyRateKg = Math.round((deltaKg / weeks) * 1000) / 1000;
    const maxRate = weightKg * 0.01; // 1% массы тела в неделю — верхняя безопасная граница
    if (weeklyRateKg > maxRate) {
      warnings.push(
        `Темп ${weeklyRateKg} кг в неделю быстрее безопасного (${Math.round(maxRate * 1000) / 1000} кг). Растяни срок или уменьши цель.`
      );
      weeklyRateKg = Math.round(maxRate * 1000) / 1000;
    }
  }

  // Знак задаём множителем: унарный минус на нуле даёт -0, а это уже разные числа.
  const sign = direction === "gain" ? 1 : direction === "lose" ? -1 : 0;
  const dailyDelta = Math.round(((weeklyRateKg * KCAL_PER_KG_FAT) / 7) * sign) * (sign === 0 ? 0 : 1);
  let targetCalories = maintenance + dailyDelta;

  const floor = sex === "male" ? 1500 : 1200;
  if (targetCalories < floor) {
    targetCalories = floor;
    warnings.push(`Норма ниже ${floor} ккал — это уже потеря мышц. Поднял до ${floor}.`);
  }

  targetCalories = Math.round(targetCalories);
  const macros = macroSplit({ calories: targetCalories, weightKg, goal: direction });

  return {
    bmr,
    maintenance,
    targetCalories,
    dailyDelta,
    direction,
    weeklyRateKg,
    macros,
    warnings,
  };
}

module.exports = { ACTIVITY, basalMetabolicRate, maintenanceCalories, macroSplit, goal };
