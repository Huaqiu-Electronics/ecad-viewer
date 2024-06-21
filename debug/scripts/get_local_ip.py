
def get_local_ip():
        return "127.0.0.1"

# Get and print the local IP address
local_ip = get_local_ip()
if local_ip:
    print("Local IP Address:", local_ip)
else:
    print("Failed to retrieve local IP address.")
