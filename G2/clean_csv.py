# !/usr/bin/env python
import pandas as pd

def clean_csv(file_path):
    # Read the CSV file into a DataFrame
    df = pd.read_csv(file_path)
    
    # Drop duplicates based on the 'reviewURL' column, keeping the first occurrence
    df_cleaned = df.drop_duplicates(subset='reviewURL', keep='first')

    print("Duplicate Dropped")
    
    # Save the cleaned DataFrame back to the CSV file
    df_cleaned.to_csv(file_path, index=False)


file_path = 'result.csv'
    
# Clean the CSV file
clean_csv(file_path)
