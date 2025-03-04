import pandas as pd

# Load your dataset
df = pd.read_csv("Tambaram_20240303_20240902.csv")

# Construct 'instruction' column with diverse queries (adjust based on your actual data and desired queries)
df['instruction'] = df.apply(lambda row: 
                              f"What's the weather forecast for {row['city']} on {row['dt']}?" 
                              if pd.notna(row['dt']) else 
                              f"Tell me about the current weather in {row['locality']}.", axis=1)

# Construct 'response' column incorporating all relevant data
df['response'] = df.apply(lambda row:
                           f"The weather forecast for {row['city']} on {row['dt']} is {row['temperature']} with {row['humidity']}% humidity. Expect {row['rain_intensity']} rain with an accumulation of {row['rain_accumulation']}." 
                           if pd.notna(row['dt']) else
                           f"The current weather in {row['locality']} is {row['temperature']} with {row['humidity']}% humidity. The wind is blowing from the {row['wind_direction']} at {row['wind_speed']}.", axis=1)

# Select only the necessary columns
df = df[['instruction', 'response']]

# Save the modified dataset
df.to_csv("autotrain_dataset.csv", index=False)