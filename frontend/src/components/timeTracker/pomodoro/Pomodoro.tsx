import { useEffect, useState } from 'react'
import { useTimer } from 'react-timer-hook'
import usePrompt from '../../../hooks/usePrompt'
import Settings from './Settings'
import TimerDisplay, { TimerState } from './TimerDisplay'

export interface PomodoroProp {
  user: User
}

export interface User {
  pomWork?: number // user's last set work duration
  pomShortBreak?: number // user's last set short break duration
  pomLongBreak?: number // user's last set long break duration
}

// the possible stages of the pomodoro
enum Stage {
  NotStarted,
  Work,
  ShortBreak,
  LongBreak,
}

// default pomodoro workflow settings (change to match comments before final submission)
const defaultWork = 0.25 * 60 // 25 minutes
const defaultShortBreak = 0.1 * 60 // 5 minutes
const defaultLongBreak = 0.5 * 60 // 15 minutes
const defaultNumPoms = 2 // after this many work sessions are completed, take long break

function Pomodoro(props: PomodoroProp) {
  // make sure a given duration is between 0 and 86400 seconds if it's defined.
  // otherwise, return a default value
  function verifyDuration(
    duration: number | undefined | null,
    defaultDuration: number
  ): number {
    if (!duration || duration < 0 || duration >= 86400) {
      return defaultDuration
    } else {
      return duration
    }
  }

  const [curStage, setStage] = useState<Stage>(Stage.NotStarted)
  const [pomsFinished, setPomsFinished] = useState(0)
  const [user, setUser] = useState<User>(props.user)

  let duration: number
  let titleString: string
  let onTimerFinish: () => void
  switch (curStage) {
    case Stage.NotStarted:
    case Stage.Work:
      titleString = 'Time to grind'
      duration = verifyDuration(user.pomWork, defaultWork)
      // when work timer finishes, incremenent the pom # and advance to either short break or long break
      onTimerFinish = () => {
        console.log('Finished work session!')
        setPomsFinished(pomsFinished + 1)
        if (pomsFinished >= defaultNumPoms) {
          // user has finished set of pomodoros, take a long break
          setStage(Stage.LongBreak)
          setPomsFinished(0)
        } else {
          // user not done with set yet, take short break
          setStage(Stage.ShortBreak)
        }
      }
      break
    case Stage.ShortBreak:
      titleString = 'Nice! Time for a short break'
      duration = verifyDuration(user.pomShortBreak, defaultShortBreak)
      // when short break timer finishes, advance to work stage
      onTimerFinish = () => {
        console.log('Short break done!')
        setStage(Stage.Work)
      }
      break
    case Stage.LongBreak:
      titleString = 'Good job! Time for a long break'
      duration = verifyDuration(user.pomLongBreak, defaultLongBreak)
      // when long break timer finishes, reset to not started stage
      onTimerFinish = () => {
        console.log('Long break done!')
        setStage(Stage.NotStarted)
      }
  }

  // returns a date object representing when the timer should expire
  function getExpireTime(): Date {
    const time = new Date()
    time.setSeconds(time.getSeconds() + duration)
    return time
  }

  const timerHook = useTimer({
    expiryTimestamp: getExpireTime(),
    autoStart: curStage !== Stage.NotStarted,
    onExpire: onTimerFinish,
  })
  // console.log(`re-render w/ stage: ${curStage}; timer duration: ${duration}`)
  // console.log(timerHook)

  // workaround to get timer to restart everytime the stage changes
  useEffect(() => {
    timerHook.restart(getExpireTime(), curStage !== Stage.NotStarted)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curStage, user])

  function getTimerState(): TimerState {
    if (curStage === Stage.NotStarted) {
      return TimerState.NotStarted
    } else if (timerHook.isRunning) {
      return TimerState.Running
    } else {
      return TimerState.Paused
    }
  }

  let onStart: () => void
  if (curStage === Stage.NotStarted) {
    onStart = () => {
      console.log('Starting timer!')
      setStage(Stage.Work)
      timerHook.start()
    }
  } else {
    onStart = timerHook.start
  }

  const timer = {
    ...timerHook,
    start: onStart,
    restart: () => timerHook.restart(getExpireTime()),
    state: getTimerState(),
  }

  // when the user tries to navigate away, if the timer is running, ask them to confirm
  usePrompt(
    'Are you sure you want to leave without logging your time?',
    timer.state === TimerState.Running || timer.state === TimerState.Paused
  )

  return (
    <div className="flex flex-col items-center">
      <span className="flex flex-row items-center bg-orange-light text-white font-semibold">
        <h2 className="px-2 text-2xl">{titleString}</h2>
        <h3 className="px-2 text-xl">#Poms: {pomsFinished}</h3>
        {curStage === Stage.NotStarted && (
          <Settings user={props.user} setUser={setUser} />
        )}
      </span>
      <TimerDisplay timer={timer} />
    </div>
  )
}

export default Pomodoro