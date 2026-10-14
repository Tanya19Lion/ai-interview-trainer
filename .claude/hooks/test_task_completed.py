import io, json, subprocess, sys, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import task_completed as hook  # noqa: E402


def stdin(description):
    return io.StringIO(json.dumps({"task_id": "1", "task_description": description}))


class CommandsFor(unittest.TestCase):
    def test_unit_suites_always_run(self):
        for description in (None, "", "package: server", "package: client", "package: docs"):
            self.assertEqual(hook.commands_for(description), hook.UNIT)

    def test_e2e_line_adds_e2e_on_top_of_unit(self):
        self.assertEqual(hook.commands_for("Do T13\npackage: E2E\n"), hook.UNIT + hook.E2E)


class Main(unittest.TestCase):
    def test_red_suite_blocks_with_exit_2_and_stops(self):
        calls = []
        def runner(cmd, timeout):
            calls.append(cmd)
            return 1, "FAIL src/x.test.ts"
        self.assertEqual(hook.main(runner, stdin(None)), 2)
        self.assertEqual(calls, hook.UNIT[:1])

    def test_green_suites_allow_completion(self):
        self.assertEqual(hook.main(lambda cmd, timeout: (0, "ok"), stdin("package: e2e")), 0)

    def test_bad_stdin_blocks(self):
        self.assertEqual(hook.main(lambda cmd, timeout: (0, "ok"), io.StringIO("not json")), 2)

    def test_missing_npm_blocks(self):
        def runner(cmd, timeout):
            raise FileNotFoundError("npm")
        self.assertEqual(hook.main(runner, stdin(None)), 2)

    def test_timeout_blocks(self):
        def runner(cmd, timeout):
            raise subprocess.TimeoutExpired(cmd, timeout)
        self.assertEqual(hook.main(runner, stdin(None)), 2)


if __name__ == "__main__":
    unittest.main()
