import OperationDetail from '../components/OperationDetail';
export default function TransferDetail() {
  return <OperationDetail opType="internal_transfer" backPath="/transfers" backLabel="Back to Transfers" />;
}
