import os
import subprocess
import logging

Altium_DOC_TO_KICAD_DOC_EXT_MAP = {
"PcbDoc" : "kicad_pcb",
"SchDoc" : "kicad_sch"
}

EXT_TO_KICAD_CLI_ARG = {
"PcbDoc" : "pcb",
"SchDoc" : "sch"
}


def convert_kicad_to_ad(ori_fp) ->str :
    kicad_project_dir = os.path.dirname(ori_fp)
    ori_fn  : str = os.path.basename(ori_fp)

    ori_suffix = ori_fn.split(".")[-1]

    if ori_suffix not in Altium_DOC_TO_KICAD_DOC_EXT_MAP:
        return

    converted_fn = ori_fn.replace(ori_suffix, Altium_DOC_TO_KICAD_DOC_EXT_MAP[ori_suffix])

    output_file_name = converted_fn
    out_fp = os.path.join(kicad_project_dir, output_file_name).replace("\\", "/")

    first_cmd = ["kicad-cli", EXT_TO_KICAD_CLI_ARG[ori_suffix],
                 "convert", "--output", out_fp,
                 ori_fp
                 ]
    print(" ".join(first_cmd))

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

    return os.path.join(kicad_project_dir, output_file_name).replace("\\", "/")


def main():
    import time

    convert_kicad_to_ad("D:/pcb_projects/Altium/large/MiniPC.PcbDoc")



if __name__ == "__main__":
    main()
