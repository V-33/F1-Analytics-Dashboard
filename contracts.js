
const CONTRACTS_KEY = "f1_contracts";




function seedContracts(contractsArray) {
  if (!localStorage.getItem(CONTRACTS_KEY)) {
    var defaults = [
      {
        contractId: "CTR001",
        teamId: "RB01",
        driverId: "DRV01",
        driverName: "Max Verstappen",
        teamName: "Red Bull Racing",
        baseSalary: 60000000,
        bonus: 10000000,
        signingBonus: 15000000,
        contractLength: 6,
        startDate: "2026-01-01",
        endDate: "2031-12-31",
        devIndex: 9.5,
        reliability: 8.8,
        status: "pending"
      },
      {
        contractId: "CTR002",
        teamId: "MER01",
        driverId: "DRV63",
        driverName: "George Russell",
        teamName: "Mercedes AMG Petronas",
        baseSalary: 18000000,
        bonus: 3000000,
        signingBonus: 20000000,
        contractLength: 3,
        startDate: "2027-01-01",
        endDate: "2029-12-31",
        devIndex: 9.1,
        reliability: 9.2,
        status: "pending"
      },
      {
        contractId: "CTR003",
        teamId: "MCL01",
        driverId: "DRV04",
        driverName: "Lando Norris",
        teamName: "McLaren F1 Team",
        baseSalary: 20000000,
        bonus: 3000000,
        signingBonus: 10000000,
        contractLength: 3,
        startDate: "2027-01-01",
        endDate: "2029-12-31",
        devIndex: 8.2,
        reliability: 8.4,
        status: "pending"
      }
    ];
    localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contractsArray || defaults));
  }
}


function getAllContracts() {
  const raw = localStorage.getItem(CONTRACTS_KEY);
  return raw ? JSON.parse(raw) : [];
}


function saveAllContracts(contracts) {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(contracts));
}




function createContract(contract) {
  if (!contract.contractId || !contract.teamId || !contract.driverId) {
    throw new Error("createContract: contractId, teamId, and driverId are required.");
  }

  const contracts = getAllContracts();
  const exists = contracts.some(c => c.contractId === contract.contractId);
  if (exists) {
    throw new Error(`createContract: contract "${contract.contractId}" already exists.`);
  }

  const newContract = Object.assign({ status: "pending" }, contract);
  contracts.push(newContract);
  saveAllContracts(contracts);
  return newContract;
}


function getContractsForDriver(driverId) {
  if (!driverId) return [];
  return getAllContracts().filter(c => c.driverId === driverId);
}


function updateContractStatus(contractId, newStatus) {
  const validStatuses = ["pending", "active", "expired", "terminated", "negotiating"];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`updateContractStatus: "${newStatus}" is not a valid status. Use one of: ${validStatuses.join(", ")}`);
  }

  const contracts = getAllContracts();
  const index = contracts.findIndex(c => c.contractId === contractId);
  if (index === -1) return null;

  contracts[index].status = newStatus;
  saveAllContracts(contracts);
  return contracts[index];
}
