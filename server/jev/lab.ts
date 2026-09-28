/**
 * Replaces substring grading in src/components/terminal.ts, which credited
 * `ping bgp-summary.example.com` and rejected `show bgp l2vpn evpn summary`.
 * Each objective is a yes/no judgment about intent; the pass mark is code.
 */
import { noul } from "@typesafe-ai/sdk";
import type { Jev, JevMeta } from "./client.ts";

export interface LabObjective {
  id: string;
  title: string;
  /** What a command must actually do to count. */
  satisfiedBy: string;
  notSatisfiedBy: string;
}

export const OBJECTIVES: LabObjective[] = [
  {
    id: "step-1",
    title: "Verify interface IP state",
    satisfiedBy:
      "The command displays the IP addressing and up/down state of the device's interfaces, including loopbacks.",
    notSatisfiedBy:
      "The command configures an interface, or inspects something other than interface addressing and state.",
  },
  {
    id: "step-2",
    title: "Verify BGP EVPN neighbor peering",
    satisfiedBy:
      "The command inspects BGP EVPN peering: neighbor state, session summary, or received prefixes for the EVPN address family.",
    notSatisfiedBy:
      "The command merely mentions BGP or EVPN in a hostname or argument, or inspects an unrelated protocol.",
  },
  {
    id: "step-3",
    title: "Run the automated pyATS health check",
    satisfiedBy:
      "The command executes an automated test or validation suite against the testbed, such as a pyATS job or an equivalent runner.",
    notSatisfiedBy:
      "The command only lists, opens, edits, or copies the test files without running them.",
  },
  {
    id: "step-4",
    title: "Confirm SD-WAN control plane health",
    satisfiedBy:
      "The command inspects SD-WAN control connections or the state of vManage, vSmart, or vBond sessions.",
    notSatisfiedBy:
      "The command inspects the data plane, or a non-SD-WAN routing protocol.",
  },
];

/** Stakes are low (a lab score), so a single clear threshold is enough. */
export const PASS = 0.8;
export const REVIEW = 0.5;

export type Verdict = "credited" | "close" | "no";

export interface CommandGrade {
  objectiveId: string;
  title: string;
  probability: number;
  verdict: Verdict;
}

const verdictFor = (probability: number): Verdict =>
  probability >= PASS ? "credited" : probability >= REVIEW ? "close" : "no";

export type LabDeviceContext = {
  name: string;
  os: string;
  type: string;
};

/** All objectives judged in one request; they are independent of each other. */
export async function gradeCommand(
  jev: Jev,
  command: string,
  device: LabDeviceContext,
): Promise<{ mode: "jev"; grades: CommandGrade[]; meta: JevMeta }> {
  const questions = Object.fromEntries(
    OBJECTIVES.map((objective) => [
      objective.id,
      noul(
        `Does the command in \`command\` accomplish this lab objective: ${objective.title}?`,
        { true: objective.satisfiedBy, false: objective.notSatisfiedBy },
      ),
    ]),
  );

  const { answers, meta } = await jev.ask({ command, device }, questions);

  return {
    mode: "jev",
    meta,
    grades: OBJECTIVES.map((objective) => {
      const probability = (answers[objective.id] as { noul: number }).noul;
      return {
        objectiveId: objective.id,
        title: objective.title,
        probability,
        verdict: verdictFor(probability),
      };
    }),
  };
}
