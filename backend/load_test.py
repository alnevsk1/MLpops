import asyncio
import time
import httpx

# ВНИМАНИЕ: Сначала запусти сервер и получи access-токен через /api/v1/auth/login/
ACCESS_TOKEN = "твой_jwt_токен_сюда" 
MODEL_ID = 1
URL = f"http://127.0.0.1:8000/api/v1/models/{MODEL_ID}/proxy/"

PAYLOAD = {
    "model": "HuggingFaceH4/zephyr-7b-alpha",
    "messages": [{"role": "user", "content": "Say hello!"}]
}
HEADERS = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

async def send_request(client, req_id):
    start = time.time()
    try:
        response = await client.post(URL, json=PAYLOAD, headers=HEADERS, timeout=30.0)
        latency = int((time.time() - start) * 1000)
        print(f"Req {req_id}: Status {response.status_code} | {latency}ms")
    except Exception as e:
        print(f"Req {req_id}: Error {str(e)}")

async def run_load_test(concurrent_requests=10):
    print(f"Starting load test with {concurrent_requests} concurrent requests...")
    async with httpx.AsyncClient() as client:
        tasks = [send_request(client, i) for i in range(concurrent_requests)]
        await asyncio.gather(*tasks)
    print("Load test completed.")

if __name__ == "__main__":
    # Если токен не задан, скрипт не пройдет проверку прав, но мы проверим нагрузку на слой авторизации
    asyncio.run(run_load_test(10))