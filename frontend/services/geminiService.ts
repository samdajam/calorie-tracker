import { GoogleGenAI } from '@google/genai';
import { runtimeConfig, buildContextMessages } from '../resources/create-a-daily-meal-17383680/config';
import { GeneratedMealPlanResponse, FoodItem, MealType, WeeklyTrendDayData, WeeklySummaryMetrics } from '../types';

// Initialize the GoogleGenAI SDK using the runtime instructions
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY,
  vertexai: true,
});

// We use gemini-2.5-flash as mandated for text and reasoning tasks (including multimodal vision)
const MODEL_NAME = 'gemini-2.5-flash';

// Extract safety settings or parameters from runtimeConfig if present
const defaultTemperature = runtimeConfig?.generationConfig?.temperature ?? 0.4;

export interface PhotoDetectionResult {
  detectedTitle: string;
  notes: string;
  detectedType: 'meal' | 'receipt' | 'label' | 'snack';
  suggestedMealSlot?: MealType;
  items: {
    name: string;
    portion: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence?: string;
  }[];
}

/**
 * Analyze an uploaded or camera-captured image of food, a prepared meal, or grocery receipt using Gemini Vision.
 */
export async function analyzeMealPhoto(
  base64Data: string,
  mimeType: string,
  scanMode: 'meal' | 'receipt' = 'meal'
): Promise<PhotoDetectionResult> {
  const prompt = scanMode === 'receipt'
    ? `You are an expert nutritionist and computer vision AI analyzing an image of a grocery receipt, food package, or menu.
Examine each food item listed on the receipt or label. Identify all edible food or grocery items, parse realistic standard serving portions, and estimate total nutritional content (calories, protein in grams, carbohydrates in grams, fats in grams) for each item.
Ignore non-food items (like paper towels, soap, taxes, etc.).

Return strictly JSON matching this structure:
{
  "detectedTitle": "Summary of scanned receipt/package",
  "notes": "Short helpful note on items recognized",
  "detectedType": "receipt",
  "items": [
    {
      "name": "Recognized Food Item",
      "portion": "e.g. 1 package, 200g, or 1 serving",
      "calories": 250,
      "protein": 15,
      "carbs": 30,
      "fats": 8,
      "confidence": "high"
    }
  ]
}`
    : `You are an expert sports dietitian and computer vision AI specializing in food identification and volumetric portion estimation.
Analyze this meal photo thoroughly.
1. Identify all separate dishes, ingredients, sauces, sides, or beverages visible on the plate or table.
2. Estimate the visual portion size based on standard plate proportions (e.g., "1 palm-sized grilled salmon fillet (approx 150g)", "1 cup steamed white rice", "1 tbsp olive dressing").
3. Compute realistic calories, protein (g), carbs (g), and fats (g) for each identified component.
4. Suggest which meal slot this is most suitable for ('breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner').

Return strictly JSON matching this structure:
{
  "detectedTitle": "Main dish or plate name",
  "notes": "Brief culinary and nutritional breakdown observation",
  "detectedType": "meal",
  "suggestedMealSlot": "lunch",
  "items": [
    {
      "name": "Food Component Name",
      "portion": "e.g. 5 oz (140g) fillet",
      "calories": 280,
      "protein": 34,
      "carbs": 0,
      "fats": 15,
      "confidence": "high"
    }
  ]
}`;

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType: mimeType || 'image/jpeg',
    },
  };

  const textPart = {
    text: prompt,
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        role: 'user',
        parts: [imagePart, textPart],
      },
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const text = response.text || '{}';
    const parsed: PhotoDetectionResult = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('Error analyzing photo with Gemini:', error);
    throw error;
  }
}

/**
 * Generate a complete daily meal plan with exact calorie and macro targets
 */
export async function generateDailyMealPlan(params: {
  calorieTarget: number;
  dietPreference: string;
  goal: string;
  allergies?: string;
  customRequests?: string;
}): Promise<GeneratedMealPlanResponse> {
  const systemPrompt = `You are an elite sports dietitian and meal planning AI.
Your task is to generate a balanced, delicious, and nutrient-dense 1-day meal plan tailored strictly to the user's calorie goal (${params.calorieTarget} kcal), dietary preference (${params.dietPreference}), fitness goal (${params.goal}), and allergy/ingredient exclusions.

Structure the plan across 5 segments:
1. 'breakfast' (Breakfast)
2. 'morningSnack' (Morning Snack)
3. 'lunch' (Lunch)
4. 'afternoonSnack' (Afternoon Snack)
5. 'dinner' (Dinner)

Ensure each food item has clear portion sizes, exact estimated calories, protein (g), carbs (g), and fats (g). The sum of all meal calories must be approximately ${params.calorieTarget} kcal (within ±50 kcal).
Return the result strictly as a JSON object adhering to this schema without Markdown wrapping.`;

  const userPrompt = `Generate a 1-day meal plan:
- Target Calories: ${params.calorieTarget} kcal
- Diet Preference: ${params.dietPreference}
- Fitness Goal: ${params.goal}
- Allergies / Dislikes: ${params.allergies || 'None'}
- Special Requests: ${params.customRequests || 'Focus on easily accessible whole foods'}

Format response strictly in JSON:
{
  "summary": "Short 1-2 sentence overview of the plan's focus",
  "targets": {
    "calories": ${params.calorieTarget},
    "protein": number,
    "carbs": number,
    "fats": number
  },
  "meals": [
    {
      "type": "breakfast" | "morningSnack" | "lunch" | "afternoonSnack" | "dinner",
      "label": "Breakfast",
      "mealName": "Recipe / Bowl Title",
      "estimatedCalories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "items": [
        {
          "name": "Food name",
          "portion": "e.g. 1/2 cup cooked",
          "calories": number,
          "protein": number,
          "carbs": number,
          "fats": number
        }
      ],
      "recipeInstructions": "Short quick prep tip"
    }
  ],
  "prepTips": ["Tip 1", "Tip 2"]
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: defaultTemperature,
      },
    });

    const text = response.text || '{}';
    const parsed: GeneratedMealPlanResponse = JSON.parse(text);
    return parsed;
  } catch (error) {
    console.error('Error generating meal plan with Gemini:', error);
    throw error;
  }
}

/**
 * Quick analysis for natural language food item entry (e.g. "2 slices of avocado sourdough toast with poached egg")
 */
export async function estimateFoodItemNutrition(description: string): Promise<Omit<FoodItem, 'id'>> {
  const prompt = `Analyze this food description and provide estimated nutritional breakdown: "${description}".
Return strictly JSON in this format:
{
  "name": "Short clean food name",
  "portion": "Estimated standard serving size",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fats": 0
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return {
      name: parsed.name || description,
      portion: parsed.portion || '1 serving',
      calories: Math.round(Number(parsed.calories) || 150),
      protein: Math.round(Number(parsed.protein) || 5),
      carbs: Math.round(Number(parsed.carbs) || 20),
      fats: Math.round(Number(parsed.fats) || 5),
    };
  } catch (error) {
    console.error('Error estimating food item:', error);
    return {
      name: description,
      portion: '1 serving',
      calories: 200,
      protein: 10,
      carbs: 20,
      fats: 8,
    };
  }
}

/**
 * Generate intelligent 7-day adherence critique and weekly nutrition advice
 */
export async function analyzeWeeklyTrendsReport(
  days: WeeklyTrendDayData[],
  metrics: WeeklySummaryMetrics
): Promise<{
  adherenceVerdict: string;
  calorieInsights: string;
  proteinInsights: string;
  actionableRecommendations: string[];
}> {
  const tableData = days.map((d) =>
    `${d.dayLabel} (${d.shortDate}): Consumed ${d.caloriesConsumed} kcal (Target: ${d.caloriesTarget} kcal, Delta: ${d.calorieDelta > 0 ? '+' : ''}${d.calorieDelta}), Protein: ${d.proteinConsumed}g/${d.proteinTarget}g, Water: ${d.waterConsumed}/${d.waterTarget} cups. Status: ${d.status}`
  ).join('\n');

  const prompt = `You are an elite clinical sports dietitian evaluating a 7-day nutritional log.
Review the following 7-day tracking data:
${tableData}

Weekly Metrics:
- Avg Daily Calories: ${metrics.avgCalories} kcal
- Avg Daily Protein: ${metrics.avgProtein}g
- Avg Hydration: ${metrics.avgWater} cups
- Days on Target: ${metrics.daysOnTarget}/7
- Surplus Days: ${metrics.surplusDaysCount}
- Deficit Days: ${metrics.deficitDaysCount}
- Protein Deficit Days: ${metrics.proteinDeficitDaysCount}

Provide an insightful, encouraging, and science-backed critique in JSON:
{
  "adherenceVerdict": "A 1-2 sentence overall grade and summary of the week's consistency",
  "calorieInsights": "Analysis of calorie surpluses vs deficits, weekend spikes, or chronic under-eating",
  "proteinInsights": "Assessment of protein distribution, muscle recovery, and specific days protein fell behind",
  "actionableRecommendations": [
    "Practical recommendation 1",
    "Practical recommendation 2",
    "Practical recommendation 3"
  ]
}`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error('Error in analyzeWeeklyTrendsReport:', error);
    return {
      adherenceVerdict: `You logged ${metrics.daysLogged} days this week, maintaining an average of ${metrics.avgCalories} kcal.`,
      calorieInsights: metrics.surplusDaysCount > 0
        ? `Identified ${metrics.surplusDaysCount} calorie surplus day(s). Balancing these with slight deficit days will keep your weekly average aligned with your goal.`
        : 'Calorie adherence is steady without severe surplus spikes.',
      proteinInsights: metrics.avgProtein < 120
        ? `Average protein reached ${metrics.avgProtein}g. Consider adding Greek yogurt or a whey scoop to snacks on lower protein days.`
        : `Great job hitting an average of ${metrics.avgProtein}g protein across the week!`,
      actionableRecommendations: [
        'Keep pre-portioning lunch carbs to avoid late afternoon energy dips.',
        'Distribute protein evenly: aim for at least 30g per meal.',
        'Drink a glass of water upon waking up to jumpstart hydration.'
      ],
    };
  }
}

/**
 * Chat with AI nutritionist assistant utilizing runtime context and buildContextMessages
 */
export async function askNutritionCoach(
  userQuery: string,
  currentMealContext: string,
  history: { role: 'user' | 'assistant'; content: string }[]
): Promise<string> {
  const rawContextMsg: any = buildContextMessages[1];
  const refText: string =
    rawContextMsg?.content?.parts?.[0]?.text ||
    rawContextMsg?.parts?.[0]?.text ||
    '';
  const contextSnippet = refText ? `Reference guidelines: ${refText.slice(0, 500)}...` : '';

  const systemInstruction = `You are a supportive, knowledgeable registered dietitian and meal prep expert.
You help users adapt their meals, substitute ingredients, answer nutrition queries, calculate macros, and suggest healthy swaps.
Always be encouraging, precise with numbers, and prioritize practical home cooking.
${contextSnippet}

Current User Plan Overview:
${currentMealContext}`;

  const conversationParts = history.slice(-4).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        ...conversationParts.map((cp) => ({
          role: cp.role as 'user' | 'model',
          parts: cp.parts,
        })),
        {
          role: 'user',
          parts: [{ text: `${systemInstruction}\n\nUser Question: ${userQuery}` }],
        },
      ],
      config: {
        temperature: 0.6,
      },
    });

    return response.text || 'I could not generate an answer right now. Please try asking again!';
  } catch (error) {
    console.error('Error in askNutritionCoach:', error);
    return "I'm having a little trouble connecting to the nutrition engine. Please check back in a moment!";
  }
}
