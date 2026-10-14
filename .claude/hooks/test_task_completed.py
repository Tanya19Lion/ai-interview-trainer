import io, json, sys, unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import task_completed as hook  # noqa: E402


def stdin(description):
    return io.StringIO(json.dumps({"task_id": "1", "task_description": description}))


class CommandsFor(unittest.TestCase):
    def test_package_line_selects_its_suite(self):
        self.assertEqual(hook.commands_for("Do T12\npackage: server\n"), hook.COMMANDS["server"])
        self.assertEqual(hook.commands_for("package: E2E"), hook.COMMANDS["e2e"])

    def test_missing_or_unknown_package_runs_both_unit_suites(self):
        self.assertEqual(hook.commands_for(None), hook.DEFAULT)
        self.assertEqual(hook.commands_for("package: docs"), hook.DEFAULT)


class Main(unittest.TestCase):
    def test_red_suite_blocks_with_exit_2_and_stops(self):
        calls = []
        def runner(cmd):
            calls.append(cmd)
            return 1, "FAIL src/x.test.ts"
        self.assertEqual(hook.main(runner, stdin(None)), 2)
        self.assertEqual(calls, hook.DEFAULT[:1])

    def test_green_suites_allow_completion(self):
        self.assertEqual(hook.main(lambda cmd: (0, "ok"), stdin("package: client")), 0)


if __name__ == "__main__":
    unittest.main()
