from PIL import Image
import os

def divide_image(image_path, output_folder, square_size=64):
    # Open the image
    img = Image.open(image_path)
    img_width, img_height = img.size

    # Create the output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    # Calculate the number of squares in each dimension
    num_squares_x = img_width // square_size
    num_squares_y = img_height // square_size

    # Loop through each square and save it as a separate image
    for i in range(num_squares_x):
        for j in range(num_squares_y):
            left = i * square_size
            upper = j * square_size
            right = left + square_size
            lower = upper + square_size

            # Crop the image
            square = img.crop((left, upper, right, lower))

            # Save the square as a separate image
            square.save(os.path.join(output_folder, f'square_{i}_{j}.png'))

if __name__ == "__main__":
    image_path = './images/monkey.png'
    output_folder = './output_squares'
    divide_image(image_path, output_folder)