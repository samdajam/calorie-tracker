import { PromptConfig, Content } from './interface';

/**
 * Runtime Configuration:
 * This object contains the specific model parameters, system instructions, and
 * tools that the generated application MUST use for its own AI-powered features.
 * Import this object directly into your application code.
 */
export const runtimeConfig: PromptConfig = {
  "title": "Create a Daily Meal",
  "description": "",
  "parameters": {
    "tokenLimits": 1048576,
    "groundingPromptConfig": {
      "disabled": true,
      "groundingConfig": {
        "sources": [
          {
            "type": "UNSPECIFIED"
          }
        ]
      }
    },
    "thinkingBudget": null,
    "thinkingLevel": "MEDIUM",
    "safetyCatFilters": [
      {
        "category": "HATE_SPEECH",
        "threshold": "OFF"
      },
      {
        "category": "DANGEROUS_CONTENT",
        "threshold": "OFF"
      },
      {
        "category": "SEXUALLY_EXPLICIT_CONTENT",
        "threshold": "OFF"
      },
      {
        "category": "HARASSMENT_CONTENT",
        "threshold": "OFF"
      }
    ]
  },
  "type": "chat",
  "examples": [],
  "model": "google/gemini-4-argon"
};

/**
 * Build-Time Context:
 * This chat history is provided as a reference for the model during application
 * generation. It is used to understand the user's intent and the desired
 * functionality of the AI.
 *
 * IMPORTANT: This conversation history MAY OR MAY NOT be 
 * included in the runtime calls of the final generated application based on
 * the user's intent and desired behavior.
 */
export const buildContextMessages: Content[] = [
  {
    "author": "user",
    "content": {
      "role": "user",
      "parts": [
        {
          "text": "create a daily meal and calorie planner"
        }
      ]
    }
  },
  {
    "author": "bot",
    "content": {
      "role": "model",
      "parts": [
        {
          "text": "Here is a comprehensive daily meal and calorie planner. \n\nBecause calorie needs vary greatly depending on your age, gender, activity level, and goals, I have created a **balanced ~1,800-calorie sample plan** below, followed by an easy guide on how to scale it up or down, and a blank template you can copy and use every day.\n\n---\n\n### Sample Daily Meal Plan (~1,800 Calories)\n*Focus: High protein, high fiber, and whole foods to keep you full and energized.*\n\n#### **Breakfast (Approx. 400 Calories)**\n*   **Meal:** Protein Oatmeal Bowl\n    *   1/2 cup rolled oats cooked in water or unsweetened almond milk (150 cal)\n    *   1 scoop vanilla or unflavored protein powder mixed in (120 cal)\n    *   1/2 cup mixed berries (40 cal)\n    *   1 tbsp chia seeds or chopped walnuts (60-90 cal)\n*   **Drink:** Black coffee or herbal tea (0 cal)\n\n#### **Morning Snack (Approx. 200 Calories)**\n*   **Meal:** Greek Yogurt & Fruit\n    *   3/4 cup plain, non-fat Greek yogurt (100 cal)\n    *   1 medium apple, sliced (95 cal)\n    *   Sprinkle of cinnamon (0 cal)\n\n#### **Lunch (Approx. 450 Calories)**\n*   **Meal:** Mediterranean Chicken Salad\n    *   4 oz grilled chicken breast (180 cal)\n    *   2 cups mixed greens, cucumber, and cherry tomatoes (50 cal)\n    *   1/2 cup cooked quinoa or chickpeas (110 cal)\n    *   1 tbsp crumbled feta cheese (40 cal)\n    *   **Dressing:** 1 tsp olive oil + lemon juice and oregano (40 cal)\n\n#### **Afternoon Snack (Approx. 200 Calories)**\n*   **Meal:** Veggies & Guacamole\n    *   1 cup sliced bell peppers, carrots, and celery (50 cal)\n    *   1/4 cup guacamole or hummus (100 cal)\n    *   1 hard-boiled egg (70 cal)\n\n#### **Dinner (Approx. 550 Calories)**\n*   **Meal:** Sheet-Pan Salmon & Veggies\n    *   5 oz baked salmon filet (280 cal)\n    *   1 medium baked sweet potato (115 cal)\n    *   1 cup roasted broccoli and asparagus (55 cal)\n    *   1 tbsp olive oil (used for cooking the fish and veggies) (120 cal)\n\n**Daily Totals:** ~1,800 Calories | **Protein:** ~135g | **Carbs:** ~160g | **Fats:** ~65g\n\n---\n\n### How to Adjust This Plan for Your Goals\n\n*   **To Reduce to ~1,500 Calories (Weight Loss):**\n    *   Cut out the Morning Snack (-200 cal).\n    *   Use cooking spray instead of 1 tbsp olive oil at dinner (-100 cal).\n*   **To Increase to ~2,200 Calories (Muscle Gain / Active Lifestyle):**\n    *   Add 1 tbsp of peanut butter to your breakfast oatmeal (+100 cal).\n    *   Add half an avocado to your lunch salad (+120 cal).\n    *   Increase your dinner sweet potato to a large one and add 1/2 cup of brown rice (+180 cal).\n\n---\n\n### Blank Daily Planner Template (Copy & Paste)\n\nUse this template in your notes app or print it out to plan your own days:\n\n**Date:** _______________\n**Calorie Goal:** _________ | **Protein Goal:** _________\n\n**Water Intake:** [ ] [ ] [ ] [ ] [ ] [ ] [ ] [ ] (8 glasses)\n\n*   **Breakfast:** \n    *   *Foods:* \n    *   *Calories:* _______\n*   **Snack 1:** \n    *   *Foods:* \n    *   *Calories:* _______\n*   **Lunch:** \n    *   *Foods:* \n    *   *Calories:* _______\n*   **Snack 2:** \n    *   *Foods:* \n    *   *Calories:* _______\n*   **Dinner:** \n    *   *Foods:* \n    *   *Calories:* _______\n\n**Total Calories:** _________ / _________ (Goal)\n\n---\n\n### Would you like me to customize this for you?\nIf you want a personalized plan, reply with:\n1. **Your specific calorie goal** (or your age, height, weight, and activity level so I can calculate it for you).\n2. **Dietary restrictions** (e.g., Vegetarian, Keto, Dairy-Free, Gluten-Free).\n3. **Foods you love or hate.** \n4. Whether you'd like a **7-day grocery list** to go with it!"
        }
      ]
    }
  }
];

// Media Data Variables:

