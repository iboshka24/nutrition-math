# nutrition-math

Calories and macros from your own body data. Zero dependencies, one file, tested.

```js
const { goal } = require("nutrition-math");

goal({ sex: "male", weightKg: 86, heightCm: 178, age: 24, activity: "light", targetWeightKg: 74, weeks: 9 });
// {
//   bmr: 1858,                 // Миффлин — Сан Жеор
//   maintenance: 2555,         // × 1.375 за 1–3 тренировки в неделю
//   targetCalories: 2051,
//   dailyDelta: -504,
//   direction: "lose",
//   weeklyRateKg: 1.333,
//   macros: { proteinG: 138, fatG: 64, carbsG: 205 },
//   warnings: []
// }
```

## Почему правила такие, а не другие

- **Миффлин — Сан Жеор**, а не Харрис — Бенедикт: на людях с лишним весом он
  ошибается меньше.
- **Белок считается от массы тела**, не от калорий: 1,6 г/кг на дефиците,
  1,8 г/кг на наборе. На калорийном проценте мышцы уходят вместе с жиром.
- **Не быстрее 1% массы тела в неделю.** Быстрее — обмен замедляется, и цель
  отодвигается. Функция сама срежет темп и скажет об этом в `warnings`.
- **Пол 1500 ккал для мужчин и 1200 для женщин.** Ниже — это уже не похудение.
- **Предупреждения возвращаются списком**, а не печатаются в консоль:
  решение показывать их пользователю принимает приложение, не библиотека.

## API

| Функция | Что делает |
| --- | --- |
| `basalMetabolicRate({ sex, weightKg, heightCm, age })` | Базальный обмен, ккал |
| `maintenanceCalories(bmr, activity)` | Суточный расход: `sedentary`, `light`, `moderate`, `active`, `athlete` |
| `macroSplit({ calories, weightKg, goal })` | Белки, жиры, углеводы в граммах |
| `goal({ ... })` | Полный расчёт цели с границами и предупреждениями |

Мусор на входе — исключение (`TypeError` / `RangeError`), а не тихая ерунда в ответе.

```bash
node --test test/
```

MIT.
