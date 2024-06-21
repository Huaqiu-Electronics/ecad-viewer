import os
import subprocess
import uuid
import logging
import time

kicad_img_home_path ="/home/kicad"

def export_glb(in_fp):
    enter_time = time.time()

    kicad_project_dir = os.path.dirname(in_fp)
    output_file_name = str(uuid.uuid4()) + ".glb"
    docker_output_fn = os.path.join(kicad_project_dir, output_file_name).replace("\\", "/")

    first_cmd = ["kicad-cli", "pcb",
                 "export", "glb", "--subst-models", "--include-tracks",
                 in_fp, "-o",
                 docker_output_fn
                 ]
    print(" ".join(first_cmd))

    start_time = time.time()

    try:
        process_export = subprocess.Popen(first_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _, stderr = process_export.communicate()
        if stderr:
            logging.error(stderr.decode())
    except Exception as e:
        logging.error(e)

    try:
        process_export.wait()
    except Exception as e:
        logging.error(e)


    print(f"Convert to glb Time taken: {time.time() - start_time} secs")

    c_output_file_name = str(uuid.uuid4()) + ".glb"
    c_docker_output_fn = os.path.join(kicad_project_dir, c_output_file_name).replace("\\", "/")

    second_cmd = [ "gltfpack",
                  "-i",
                  docker_output_fn, "-v", "-cc", "-tc", "-ts", "0.5", "-o",
                  c_docker_output_fn
                  ]

    print(" ".join(second_cmd))

    start_time = time.time()

    try:
        process_pack = subprocess.Popen(second_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        _, stderr = process_pack.communicate()
        if stderr:
            logging.error(stderr.decode())
    except Exception as e:
        logging.error(e)

    try:
        process_pack.wait()
    except Exception as e:
        logging.error(e)

    print(f"Compress glb {time.time() - start_time} secs")

    print(f"PCB to glb  Time taken: {time.time() - enter_time} secs")


    return os.path.join(kicad_project_dir, c_output_file_name).replace("\\", "/")


def main():
    export_glb("D:/pcb_projects/Altium/large/MiniPC.kicad_pcb")
    export_glb("D:/code/kicad/build/out/video/video.kicad_pcb")




if __name__ == "__main__":
    main()
