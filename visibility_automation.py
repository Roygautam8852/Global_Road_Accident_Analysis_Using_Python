import pandas as pd
import joblib

# ---------------- LOAD TRAINED MODEL ----------------
model = joblib.load("visibility_model.pkl")
model_columns = joblib.load("model_columns.pkl")

# ---------------- SAFETY LOGIC ----------------
def driving_safety(visibility):
    if visibility >= 70:
        return "SAFE to drive 🟢"
    elif visibility >= 40:
        return "OKAY – Drive with caution 🟡"
    else:
        return "DANGEROUS – Avoid driving 🔴"

# ---------------- PREDICTION FUNCTION ----------------
def predict_visibility(time_of_day, area, weather, road_type):
    sample = pd.DataFrame([{
        "Time of Day": time_of_day,
        "Urban/Rural": area,
        "Weather Conditions": weather,
        "Road Type": road_type
    }])

    sample = pd.get_dummies(sample, drop_first=True)
    sample = sample.reindex(columns=model_columns, fill_value=0)

    visibility = model.predict(sample)[0]
    decision = driving_safety(visibility)

    return round(visibility, 2), decision

# ---------------- AUTOMATION LOOP ----------------
if __name__ == "__main__":
    print("\n🚗 Driving Safety Automation System")
    print("----------------------------------")

    while True:
        print("\nEnter driving conditions:")

        time_of_day = input("Time of Day (Morning/Evening/Night): ").strip()
        area = input("Area (Urban/Rural): ").strip()
        weather = input("Weather (Clear/Rain/Fog/etc): ").strip()
        road = input("Road Type (Highway/City/Rural): ").strip()

        vis, status = predict_visibility(
            time_of_day, area, weather, road
        )

        print("\n📊 Prediction Result")
        print("-------------------")
        print("Predicted Visibility Level:", vis)
        print("Driving Decision:", status)

        # -------- CONTINUE / EXIT OPTION --------
        choice = input("\nDo you want to continue? (y/n): ").strip().lower()

        if choice != "y":
            print("\n✅ Exiting Driving Safety Automation System.")
            print("Stay Safe! 🚦")
            break
