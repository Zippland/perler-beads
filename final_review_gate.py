# final_review_gate.py
import sys
import os

if __name__ == "__main__":
    # Try to make stdout unbuffered for more responsive interaction.
    # This might not work on all platforms or if stdout is not a TTY,
    # but it's a good practice for this kind of interactive script.
    try:
        sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)
    except Exception:
        pass # Ignore if unbuffering fails, e.g., in certain environments

    try:
        sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', buffering=1)
    except Exception:
        pass # Ignore

    print("--- FINAL REVIEW GATE ACTIVE ---", flush=True)
    print("AI has completed its primary actions. Awaiting your review or further sub-prompts.", flush=True)
    print("Type your sub-prompt, or one of: 'TASK_COMPLETE', 'Done', 'Quit', 'q' to signal completion.", flush=True) # MODIFIED
    
    active_session = True
    while active_session:
        try:
            # Signal that the script is ready for input.
            # The AI doesn't need to parse this, but it's good for user visibility.
            print("REVIEW_GATE_AWAITING_INPUT:", end="", flush=True) 
            
            line = sys.stdin.readline()
            
            if not line:  # EOF
                print("--- REVIEW GATE: STDIN CLOSED (EOF), EXITING SCRIPT ---", flush=True)
                active_session = False
                break
            
            user_input = line.strip()

            # Check for exit conditions
            if user_input.upper() in ['TASK_COMPLETE', 'DONE', 'QUIT', 'Q']: # MODIFIED: Empty string no longer exits
                print(f"--- REVIEW GATE: USER SIGNALED COMPLETION WITH '{user_input.upper()}' ---", flush=True)
                active_session = False
                break
            elif user_input: # If there's any other non-empty input (and not a completion command)
                # This is the critical line the AI will "listen" for.
                print(f"USER_REVIEW_SUB_PROMPT: {user_input}", flush=True)
            # If user_input was empty (and not a completion command),
            # the loop simply continues, and "REVIEW_GATE_AWAITING_INPUT:" will be printed again.
            
        except KeyboardInterrupt:
            print("--- REVIEW GATE: SESSION INTERRUPTED BY USER (KeyboardInterrupt) ---", flush=True)
            active_session = False
            break
        except Exception as e:
            print(f"--- REVIEW GATE SCRIPT ERROR: {e} ---", flush=True)
            active_session = False
            break
            
    print("--- FINAL REVIEW GATE SCRIPT EXITED ---", flush=True) 