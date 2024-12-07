import gradio as gr
import math

def calculator(num1, operation, num2):
    """
    Perform calculator operations
    """
    try:
        num1 = float(num1)
        num2 = float(num2)
        
        if operation == "+":
            return float(num1 + num2)
        elif operation == "-":
            return float(num1 - num2)
        elif operation == "×":
            return float(num1 * num2)
        elif operation == "÷":
            if num2 == 0:
                return "Error: Division by zero"
            return float(num1 / num2)
        elif operation == "^":
            return float(num1 ** num2)
        elif operation == "√":
            # For square root, we only use num1
            if num1 < 0:
                return "Error: Cannot calculate square root of negative number"
            return float(math.sqrt(num1))
        elif operation == "%":
            return float(num1 % num2)
        elif operation == "log":
            if num1 <= 0:
                return "Error: Cannot calculate log of non-positive number"
            return float(math.log(num1, num2))
        else:
            return "Invalid operation"
            
    except ValueError:
        return "Error: Invalid input"
    except Exception as e:
        return f"Error: {str(e)}"

# Create the Gradio interface
def create_calculator_interface():
    # Define input components
    num1_input = gr.Number(label="First Number")
    operation_dropdown = gr.Dropdown(
        choices=["+", "-", "×", "÷", "^", "√", "%", "log"],
        label="Operation",
        value="+"
    )
    num2_input = gr.Number(label="Second Number")
    
    # Define output component
    output = gr.Number(label="Result")
    
    # Create the interface
    calculator_interface = gr.Interface(
        fn=calculator,
        inputs=[num1_input, operation_dropdown, num2_input],
        outputs=output,
        title="Advanced Calculator",
        description="Enter numbers and select an operation to calculate",
        theme="huggingface",
        css="""
            .gradio-container {
                background-color: #f0f2f6;
                border-radius: 10px;
                padding: 20px;
            }
            .output-class {
                font-size: 1.2em;
                font-weight: bold;
                color: #2e7d32;
            }
        """
    )
    
    return calculator_interface

# Launch the calculator
if __name__ == "__main__":
    calculator_app = create_calculator_interface()
    calculator_app.launch(
        share=True,
        server_name="0.0.0.0",
        server_port=7860,
        show_error=True
    ) 