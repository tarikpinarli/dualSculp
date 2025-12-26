import trimesh
import sys

def convert(input_file, output_file):
    # Load the STL
    mesh = trimesh.load(input_file)
    
    # Optional: Simplify the mesh (Decimate) to 10% for web speed
    # factor = 0.1
    # mesh = mesh.simplify_quadratic_decimation(int(len(mesh.faces) * factor))
    
    # Export as GLB
    mesh.export(output_file)
    print(f"Successfully converted {input_file} to {output_file}")

if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])