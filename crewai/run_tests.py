#!/usr/bin/env python3
"""
PriceWaze Testing CLI - Run the 25-agent testing system.

Usage:
    python run_tests.py --full                    # Run all 25 agents
    python run_tests.py --ui                      # Run UI/UX squad only
    python run_tests.py --e2e                     # Run E2E squad only
    python run_tests.py --backend                 # Run backend squad only
    python run_tests.py --smoke                   # Run quick smoke test
    python run_tests.py --full --url https://...  # Test specific URL
"""

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

# Add crewai directory to path
sys.path.insert(0, str(Path(__file__).parent))

from testing_crews import (
    FullTestingCrew,
    UIUXTestingCrew,
    E2ETestingCrew,
    BackendTestingCrew,
    QuickSmokeTestCrew,
)


def main():
    parser = argparse.ArgumentParser(
        description="PriceWaze 25-Agent Testing System",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_tests.py --full                    Run comprehensive testing with all 25 agents
  python run_tests.py --smoke                   Quick smoke test (5 minutes)
  python run_tests.py --ui --url http://...     Test UI/UX on specific URL
  python run_tests.py --e2e --verbose           E2E testing with verbose output
        """
    )

    # Test type selection
    test_group = parser.add_mutually_exclusive_group(required=True)
    test_group.add_argument("--full", action="store_true", help="Run all 25 agents (comprehensive)")
    test_group.add_argument("--ui", action="store_true", help="Run UI/UX testing squad (7 agents)")
    test_group.add_argument("--e2e", action="store_true", help="Run E2E testing squad (8 agents)")
    test_group.add_argument("--backend", action="store_true", help="Run backend testing squad (5 agents)")
    test_group.add_argument("--smoke", action="store_true", help="Quick smoke test (5 agents)")

    # Options
    parser.add_argument("--url", default="http://localhost:3000", help="Base URL to test (default: localhost:3000)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Enable verbose output")
    parser.add_argument("--output", "-o", help="Output file for results (JSON)")
    parser.add_argument("--fixes", action="store_true", help="Generate fix implementations (full test only)")

    args = parser.parse_args()

    print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                 🧪 PriceWaze Testing System                      ║
║                    25 AI Agents • 5 Squads                       ║
╚══════════════════════════════════════════════════════════════════╝

🎯 Target: {args.url}
📊 Mode: {'Full (25 agents)' if args.full else 'UI/UX (7 agents)' if args.ui else 'E2E (8 agents)' if args.e2e else 'Backend (5 agents)' if args.backend else 'Smoke Test (5 agents)'}
🕐 Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

    # Run selected test suite
    try:
        if args.full:
            print("🚀 Launching Full Testing Crew (25 agents)...")
            print("   📋 Coordination Squad (3): Orchestrator, Quality Gate, Reporter")
            print("   🎨 UI/UX Squad (7): Visual, A11y, Responsive, Perf, UX, Design, Animation")
            print("   🔄 E2E Squad (8): Auth, CRUD, Forms, Nav, Errors, State, Multi-user, Edge")
            print("   🗄️  Backend Squad (5): API, DB, Data Flow, Realtime, Migration")
            print("   🔧 Fixer Squad (2): UI/UX Implementer, Integration Fixer")
            print()

            crew = FullTestingCrew(verbose=args.verbose, base_url=args.url)
            result = crew.run(generate_fixes=args.fixes)

        elif args.ui:
            print("🎨 Launching UI/UX Testing Crew (7 agents)...")
            crew = UIUXTestingCrew(verbose=args.verbose, base_url=args.url)
            result = crew.run()

        elif args.e2e:
            print("🔄 Launching E2E Testing Crew (8 agents)...")
            crew = E2ETestingCrew(verbose=args.verbose, base_url=args.url)
            result = crew.run()

        elif args.backend:
            print("🗄️  Launching Backend Testing Crew (5 agents)...")
            crew = BackendTestingCrew(verbose=args.verbose, base_url=args.url)
            result = crew.run()

        elif args.smoke:
            print("💨 Launching Quick Smoke Test (5 agents)...")
            crew = QuickSmokeTestCrew(verbose=args.verbose, base_url=args.url)
            result = crew.run()

        # Output results
        print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                    📊 Test Results                               ║
╚══════════════════════════════════════════════════════════════════╝
""")

        if "report" in result:
            print(result["report"])
        elif "final_report" in result:
            print(result["final_report"])

        # Save to file if requested
        if args.output:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            # Add metadata
            result["metadata"] = {
                "timestamp": datetime.now().isoformat(),
                "url_tested": args.url,
                "test_type": "full" if args.full else "ui" if args.ui else "e2e" if args.e2e else "backend" if args.backend else "smoke",
            }

            with open(output_path, "w") as f:
                json.dump(result, f, indent=2, default=str)

            print(f"\n💾 Results saved to: {output_path}")

        print(f"""
╔══════════════════════════════════════════════════════════════════╗
║                    ✅ Testing Complete                           ║
╚══════════════════════════════════════════════════════════════════╝
🕐 Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
""")

    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error during testing: {e}")
        raise


if __name__ == "__main__":
    main()
