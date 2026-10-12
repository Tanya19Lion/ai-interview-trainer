"""llm_judge_provider.py - провайдер для model-graded асертів (llm-rubric).
Без цього Promptfoo стукає в OpenAI за замовчуванням, а в проєкті немає
OPENAI_API_KEY - авторизація йде через локальну сесію claude CLI, як і решта
сьюту. Головна (orchestrator) сесія, не пісочниця: суддя читає лише текст
рубрики + відповідь агента, нічого не пише у файлову систему."""
import re
import subprocess


def call_api(prompt, options, context):
    # timeout: без нього зависла claude -p вішає грейдинг назавжди.
    run = subprocess.run(["claude", "-p", prompt], timeout=120,
                          capture_output=True, encoding="utf-8", errors="replace")
    out = run.stdout
    # Глобальний CLAUDE.md змушує кожну НОВУ сесію починати з привітання -
    # JSON рубрики йде ПІСЛЯ нього, і Promptfoo не завжди витягає JSON із
    # суміші тексту. Беремо найбільший {...}-блок у відповіді.
    blocks = re.findall(r"\{[\s\S]*\}", out)
    if blocks:
        out = max(blocks, key=len)
    return {"output": out}
