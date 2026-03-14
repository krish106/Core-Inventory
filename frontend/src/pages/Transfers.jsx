import OperationsList from '../components/OperationsList';
export default function Transfers() {
  return <OperationsList type="internal_transfer" title="Internal Transfers" basePath="/transfers" />;
}
