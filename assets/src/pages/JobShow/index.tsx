import { useParams } from 'react-router-dom'
import { useJob, useCandidates } from '../../hooks'
import { Text } from '@welcome-ui/text'
import { Flex } from '@welcome-ui/flex'
import { Box } from '@welcome-ui/box'
import { useMemo, useCallback } from 'react'
import { Candidate } from '../../api'
import CandidateCard from '../../components/Candidate'
import { Badge } from '@welcome-ui/badge'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

type Statuses = 'new' | 'interview' | 'hired' | 'rejected'
const COLUMNS: Statuses[] = ['new', 'interview', 'hired', 'rejected']

interface SortedCandidates {
  new?: Candidate[]
  interview?: Candidate[]
  hired?: Candidate[]
  rejected?: Candidate[]
}

const ItemTypes = {
  CANDIDATE: 'candidate',
}

const DraggableCandidateCard = ({ candidate }: { candidate: Candidate }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CANDIDATE,
    item: { candidate },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }))

  return (
    <div ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }}>
      <CandidateCard candidate={candidate} />
    </div>
  )
}

const DroppableColumn = ({
  status,
  candidates,
  onDrop,
}: {
  status: Statuses
  candidates: Candidate[]
  onDrop: (candidate: Candidate, newStatus: Statuses) => void
}) => {
  const [, drop] = useDrop(() => ({
    accept: ItemTypes.CANDIDATE,
    drop: (item: { candidate: Candidate }) => onDrop(item.candidate, status),
  }))

  return (
    <Box
      ref={drop}
      w={300}
      border={1}
      backgroundColor="white"
      borderColor="neutral-30"
      borderRadius="md"
      overflow="hidden"
    >
      <Flex
        p={10}
        borderBottom={1}
        borderColor="neutral-30"
        alignItems="center"
        justify="space-between"
      >
        <Text color="black" m={0} textTransform="capitalize">
          {status}
        </Text>
        <Badge>{candidates.length}</Badge>
      </Flex>
      <Flex direction="column" p={10} pb={0}>
        {candidates.map((candidate) => (
          <DraggableCandidateCard key={candidate.id} candidate={candidate} />
        ))}
      </Flex>
    </Box>
  )
}

function JobShow() {
  const { jobId } = useParams()
  const { job } = useJob(jobId)
  const { candidates, refetch } = useCandidates(jobId)

  const sortedCandidates = useMemo(() => {
    if (!candidates) return {}

    return candidates.reduce<SortedCandidates>((acc, c: Candidate) => {
      acc[c.status] = [...(acc[c.status] || []), c].sort((a, b) => a.position - b.position)
      return acc
    }, {})
  }, [candidates])

  const handleDrop = useCallback(
    async (candidate: Candidate, newStatus: Statuses) => {
      const updatedCandidate = { ...candidate, status: newStatus }
      // Update the candidate status and position in the backend
      await fetch(`http://localhost:4000/api/jobs/${jobId}/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ candidate: updatedCandidate }),
      })
      // Refresh the candidates list
      // You might need to refetch the candidates or update the state here
      refetch()
    },
    [jobId, refetch]
  )

  return (
    <DndProvider backend={HTML5Backend}>
      <Box backgroundColor="neutral-70" p={20} alignItems="center">
        <Text variant="h5" color="white" m={0}>
          {job?.name}
        </Text>
      </Box>

      <Box p={20}>
        <Flex gap={10}>
          {COLUMNS.map((column) => (
            <DroppableColumn
              key={column}
              status={column}
              candidates={sortedCandidates[column] || []}
              onDrop={handleDrop}
            />
          ))}
        </Flex>
      </Box>
    </DndProvider>
  )
}

export default JobShow